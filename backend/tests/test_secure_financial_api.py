from types import SimpleNamespace

from backend import db
from backend.api import app
from backend.auth import AuthenticatedUser, get_current_user


def user(user_id: str, email: str, token: str) -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=email, claims={"sub": user_id}, access_token=token)


class MockResponse:
    def __init__(self, status_code=200, data=None, text=""):
        self.status_code = status_code
        self._data = data if data is not None else []
        self.text = text

    def json(self):
        return self._data


def configure(client, monkeypatch, current_user: AuthenticatedUser, responses: list[MockResponse]):
    monkeypatch.setenv("SUPABASE_URL", "http://127.0.0.1:56000")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "local-anon-key")
    app.dependency_overrides[get_current_user] = lambda: current_user
    calls = []

    def fake_request(method, url, **kwargs):
        calls.append(SimpleNamespace(method=method, url=url, kwargs=kwargs))
        return responses.pop(0)

    monkeypatch.setattr("backend.postgres.financial.requests.request", fake_request)
    return calls


def teardown_function():
    app.dependency_overrides.clear()


def test_secure_dashboard_uses_bearer_token_and_returns_user_scoped_postgrest_rows(client, monkeypatch):
    calls = configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(data=[{
            "id": "txn-a",
            "transaction_date": "2026-10-07",
            "amount": "100.50",
            "note": "A row",
            "type": "expense",
            "categories": {"id": "cat-a", "name": "Food", "type": "expense"},
        }]),
        MockResponse(data=[{
            "id": "budget-a",
            "amount": "6000",
            "period": "monthly",
            "start_date": "2026-10-01",
            "end_date": None,
            "categories": {"id": "cat-a", "name": "Food", "type": "expense"},
        }]),
    ])

    response = client.get("/api/secure/data")

    assert response.status_code == 200
    assert response.json()["transactions"] == [{
        "id": "txn-a",
        "date": "2026-10-07",
        "category": "food",
        "amount": 100.5,
        "note": "A row",
        "type": "expense",
    }]
    assert response.json()["config"]["budgets"] == {"food": 6000.0}
    assert calls[0].kwargs["headers"]["Authorization"] == "Bearer token-a"
    assert calls[0].kwargs["headers"]["apikey"] == "local-anon-key"


def test_secure_create_derives_owner_from_verified_identity(client, monkeypatch):
    calls = configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(data=[{"id": "cat-a", "name": "Food", "type": "expense"}]),
        MockResponse(status_code=201, data=[]),
    ])

    response = client.post("/api/secure/transactions", json={
        "type": "expense",
        "category": "food",
        "amount": 100,
        "date": "2026-10-07",
        "note": "Lunch",
        "user_id": "forged-user-b",
    })

    assert response.status_code == 200
    assert calls[1].kwargs["json"]["user_id"] == "user-a"
    assert "forged-user-b" not in str(calls[1].kwargs["json"])


def test_secure_delete_uses_rls_enforced_postgrest_request(client, monkeypatch):
    calls = configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=200, data=[{"id": "txn-a"}]),
    ])

    response = client.delete("/api/secure/transactions/txn-a")

    assert response.status_code == 200
    assert calls[0].method == "DELETE"
    assert "transactions?id=eq.txn-a" in calls[0].url
    assert "select=id" in calls[0].url
    assert calls[0].kwargs["headers"]["Authorization"] == "Bearer token-a"
    assert calls[0].kwargs["headers"]["Prefer"] == "return=representation"


def test_secure_delete_denies_when_rls_hides_the_transaction(client, monkeypatch):
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=200, data=[]),
    ])

    response = client.delete("/api/secure/transactions/txn-b")

    assert response.status_code == 404
    assert response.json()["detail"] == "Transaction not found"


def test_secure_update_denies_when_rls_hides_the_transaction(client, monkeypatch):
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=200, data=[]),
    ])

    response = client.patch("/api/secure/transactions/txn-b", json={"note": "Stolen"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Transaction not found"


def test_secure_budget_crud_derives_owner_and_uses_rls_enforced_requests(client, monkeypatch):
    calls = configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(data=[{"id": "cat-a", "name": "Food", "type": "expense"}]),
        MockResponse(status_code=201, data=[{
            "id": "budget-a",
            "amount": "1000",
            "period": "monthly",
            "start_date": "2026-10-01",
            "end_date": None,
            "categories": {"id": "cat-a", "name": "Food", "type": "expense"},
        }]),
        MockResponse(status_code=200, data=[{
            "id": "budget-a",
            "amount": "1200",
            "period": "monthly",
            "start_date": "2026-10-01",
            "end_date": None,
            "categories": {"id": "cat-a", "name": "Food", "type": "expense"},
        }]),
        MockResponse(status_code=200, data=[{"id": "budget-a"}]),
    ])

    create_response = client.post("/api/secure/budgets", json={
        "category": "food",
        "amount": 1000,
        "period": "monthly",
        "start_date": "2026-10-01",
        "user_id": "forged-user-b",
    })
    update_response = client.patch("/api/secure/budgets/budget-a", json={"amount": 1200})
    delete_response = client.delete("/api/secure/budgets/budget-a")

    assert create_response.status_code == 200
    assert update_response.status_code == 200
    assert delete_response.status_code == 200
    assert calls[1].kwargs["json"]["user_id"] == "user-a"
    assert "forged-user-b" not in str(calls[1].kwargs["json"])
    assert calls[2].method == "PATCH"
    assert "budgets?id=eq.budget-a" in calls[2].url
    assert calls[3].method == "DELETE"
    assert calls[3].kwargs["headers"]["Authorization"] == "Bearer token-a"


def test_secure_budget_update_denies_when_rls_hides_budget(client, monkeypatch):
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=200, data=[]),
    ])

    response = client.patch("/api/secure/budgets/budget-b", json={"amount": 1200})

    assert response.status_code == 404
    assert response.json()["detail"] == "Budget not found"


def test_secure_export_contains_only_postgrest_rows(client, monkeypatch):
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(data=[{
            "id": "txn-a",
            "transaction_date": "2026-10-07",
            "amount": "100",
            "note": "A row",
            "type": "income",
            "categories": {"id": "cat-a", "name": "Salary", "type": "income"},
        }]),
        MockResponse(data=[]),
    ])

    response = client.get("/api/secure/export")

    assert response.status_code == 200
    assert "txn-a" in response.text
    assert "Salary".lower() in response.text


def test_secure_api_does_not_fallback_to_sqlite_when_postgrest_fails(client, monkeypatch):
    db.add("2026-10-07", "food", 450, "sqlite row must not leak", "expense", 1)
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=503, data={"message": "unavailable"}),
    ])

    response = client.get("/api/secure/data")

    assert response.status_code == 502
    assert "sqlite row must not leak" not in response.text
    assert len(db.all_rows()) == 1
