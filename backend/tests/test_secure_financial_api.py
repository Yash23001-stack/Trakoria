import logging
from types import SimpleNamespace

import pytest
import requests

from backend import db
from backend.postgres.financial import _log_storage_failure
from backend.api import app
from backend.auth import AuthenticatedUser, get_current_user


def user(user_id: str, email: str, token: str) -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=email, claims={"sub": user_id}, access_token=token)


class MockResponse:
    def __init__(self, status_code=200, data=None, text="", json_error: Exception | None = None):
        self.status_code = status_code
        self._data = data if data is not None else []
        self.text = text
        self._json_error = json_error

    def json(self):
        if self._json_error:
            raise self._json_error
        return self._data


def configure(client, monkeypatch, current_user: AuthenticatedUser, responses: list[MockResponse | Exception]):
    monkeypatch.setenv("SUPABASE_URL", "http://127.0.0.1:56000")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "local-anon-key")
    app.dependency_overrides[get_current_user] = lambda: current_user
    calls = []

    def fake_request(method, url, **kwargs):
        calls.append(SimpleNamespace(method=method, url=url, kwargs=kwargs))
        response = responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

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


@pytest.mark.parametrize("upstream_status", [401, 403])
def test_secure_dashboard_logs_upstream_auth_errors_without_leaking_secrets(
    client,
    monkeypatch,
    caplog,
    upstream_status,
):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(
            status_code=upstream_status,
            data={
                "code": "PGRST301",
                "message": "Bearer token-a rejected for a@example.com",
            },
        ),
    ])

    response = client.get("/api/secure/data")

    assert response.status_code == 502
    assert response.json()["detail"] == "Supabase financial storage request failed."
    record = caplog.records[-1]
    assert record.upstream_status_code == upstream_status
    assert record.upstream_error_code == "PGRST301"
    assert not hasattr(record, "upstream_error_message")
    assert record.upstream_path == "transactions"
    assert "token-a" not in caplog.text
    assert "a@example.com" not in caplog.text
    assert "local-anon-key" not in caplog.text


@pytest.mark.parametrize(
    ("status_code", "error_code", "message"),
    [
        (404, "PGRST205", "Could not find the table public.transactions in the schema cache"),
        (400, "42703", "column transactions.transaction_date does not exist"),
    ],
)
def test_secure_dashboard_logs_schema_errors_but_keeps_generic_502(
    client,
    monkeypatch,
    caplog,
    status_code,
    error_code,
    message,
):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=status_code, data={"code": error_code, "message": message}),
    ])

    response = client.get("/api/secure/data")

    assert response.status_code == 502
    assert response.json()["detail"] == "Supabase financial storage request failed."
    record = caplog.records[-1]
    assert record.upstream_status_code == status_code
    assert record.upstream_error_code == error_code
    assert not hasattr(record, "upstream_error_message")
    assert record.upstream_path == "transactions"


def test_secure_dashboard_logs_timeout_without_leaking_request_headers(client, monkeypatch, caplog):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        requests.Timeout("request timed out for token-a"),
    ])

    response = client.get("/api/secure/data")

    assert response.status_code == 502
    assert response.json()["detail"] == "Supabase financial storage request failed."
    record = caplog.records[-1]
    assert record.upstream_status_code is None
    assert record.upstream_failure_reason == "timeout"
    assert record.upstream_exception_type == "Timeout"
    assert "token-a" not in caplog.text
    assert "Authorization" not in caplog.text
    assert "apikey" not in caplog.text


def test_secure_dashboard_rejects_and_logs_malformed_postgrest_json(client, monkeypatch, caplog):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=200, json_error=ValueError("not json")),
    ])

    response = client.get("/api/secure/data")

    assert response.status_code == 502
    assert response.json()["detail"] == "Supabase financial storage request failed."
    record = caplog.records[-1]
    assert record.upstream_status_code == 200
    assert record.upstream_failure_reason == "malformed_json"
    assert record.upstream_path == "transactions"


def test_secure_dashboard_rejects_and_logs_unexpected_postgrest_json_shape(client, monkeypatch, caplog):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(status_code=200, data={"unexpected": "object"}),
    ])

    response = client.get("/api/secure/data")

    assert response.status_code == 502
    assert response.json()["detail"] == "Supabase financial storage request failed."
    record = caplog.records[-1]
    assert record.upstream_status_code == 200
    assert record.upstream_failure_reason == "unexpected_json_shape"
    assert record.upstream_path == "transactions"


def test_storage_warning_renders_only_allowlisted_diagnostics(caplog):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    sensitive = "private-user secret-key Bearer private-token private@example.com financial-note"
    _log_storage_failure(
        "get", f"/transactions/private-user?note=eq.{sensitive}#private-fragment",
        reason="http_error", status_code=403,
        response=MockResponse(status_code=403, data={
            "code": "42501", "message": sensitive, "details": sensitive,
        }),
        exc=requests.ConnectionError(sensitive),
    )
    record = caplog.records[-1]
    assert logging.Formatter("%(message)s").format(record) == (
        "Supabase financial storage request failed method=GET table=transactions "
        "status=403 code=42501 reason=http_error exception=ConnectionError"
    )
    assert record.upstream_path == "transactions"
    assert not hasattr(record, "upstream_error_message")
    for forbidden in ("private-user", "secret-key", "private-token", "private@example.com",
                      "financial-note", "private-fragment", "note=", "details"):
        assert forbidden not in repr(record.__dict__)


@pytest.mark.parametrize("path,expected", [
    ("budgets/private-id?user_id=eq.private-id", "budgets"),
    ("categories?select=private-data", "categories"),
    ("transactions#private-id", "transactions"),
    ("https://private-host/rest/v1/transactions?key=private-key", "unknown"),
    ("private-id/transactions", "unknown"),
    ("transactions\nprivate-data", "unknown"),
    (None, "unknown"),
])
def test_storage_warning_strips_paths(caplog, path, expected):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    _log_storage_failure("GET", path, reason="timeout")
    record = caplog.records[-1]
    assert record.upstream_path == expected
    assert "private" not in repr(record.__dict__)


@pytest.mark.parametrize("status,payload", [
    (None, None), (True, []), ("403", {"code": "private-key"}),
    (-1, {"code": ["42501"]}), (600, {"code": "TOKEN"}), ({}, {}), ([], {}),
])
def test_storage_warning_rejects_malformed_values(caplog, status, payload):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    unapproved_exception = type("private_exception_name", (Exception,), {})
    _log_storage_failure(
        ["GET"], {}, reason={"private-reason": True}, status_code=status,
        response=MockResponse(data=payload), exc=unapproved_exception("private-text"),
    )
    record = caplog.records[-1]
    assert record.getMessage() == (
        "Supabase financial storage request failed method=unknown table=unknown "
        "status=none code=none reason=unknown exception=none"
    )
    assert "private" not in repr(record.__dict__)


@pytest.mark.parametrize("json_error", [ValueError("private-body"), RuntimeError("private-body")])
def test_storage_warning_diagnostic_parsing_cannot_mask_failure(caplog, json_error):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    _log_storage_failure("GET", "budgets", reason="http_error", status_code=502,
                         response=MockResponse(json_error=json_error))
    record = caplog.records[-1]
    assert record.upstream_status_code == 502
    assert record.upstream_error_code is None
    assert "private-body" not in repr(record.__dict__)


def test_dashboard_second_read_failure_keeps_client_response(client, monkeypatch, caplog):
    caplog.set_level(logging.WARNING, logger="backend.postgres.financial")
    calls = configure(client, monkeypatch, user("user-a", "a@example.com", "token-a"), [
        MockResponse(data=[]),
        MockResponse(status_code=400, data={"code": "42703", "message": "private-upstream-text"}),
    ])
    response = client.get("/api/secure/data")
    assert response.status_code == 502
    assert response.json() == {"detail": "Supabase financial storage request failed."}
    assert [call.method for call in calls] == ["GET", "GET"]
    record = caplog.records[-1]
    assert record.upstream_path == "budgets"
    assert "table=budgets status=400 code=42703 reason=http_error exception=none" in record.getMessage()
    assert "private-upstream-text" not in repr(record.__dict__)
