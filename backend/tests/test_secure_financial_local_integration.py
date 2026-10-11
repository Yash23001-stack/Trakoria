import pytest
from fastapi.testclient import TestClient

from backend.api import app

from .test_supabase_rls_integration import (
    SupabaseLocalSettings,
    SupabaseUser,
    _auth_url,
    _create_user,
    _headers,
    _http_json,
    _postgrest_headers,
    _rest_url,
    supabase_settings,
)


def _cleanup(settings: SupabaseLocalSettings, users: list[SupabaseUser]) -> None:
    for table in ["budgets", "transactions", "categories"]:
        for user in users:
            _http_json(
                "DELETE",
                _rest_url(settings, table, f"user_id=eq.{user.id}"),
                headers=_postgrest_headers(settings, service_role=True),
            )

    for user in users:
        _http_json(
            "DELETE",
            _auth_url(settings, f"admin/users/{user.id}"),
            headers=_headers(settings.service_role_key),
        )


def _auth(user: SupabaseUser) -> dict[str, str]:
    return {"Authorization": f"Bearer {user.access_token}"}


def _transactions(response) -> list[dict]:
    assert response.status_code == 200, response.text
    return response.json()["transactions"]


def _budgets(response) -> list[dict]:
    assert response.status_code == 200, response.text
    return response.json()["budgets"]


@pytest.fixture()
def secure_route_users(supabase_settings: SupabaseLocalSettings):
    users: list[SupabaseUser] = []
    try:
        users = [
            _create_user(supabase_settings, "secure-route-a"),
            _create_user(supabase_settings, "secure-route-b"),
        ]
        yield users[0], users[1]
    finally:
        _cleanup(supabase_settings, users)


def test_secure_financial_routes_deny_direct_cross_user_access(
    monkeypatch,
    supabase_settings: SupabaseLocalSettings,
    secure_route_users: tuple[SupabaseUser, SupabaseUser],
):
    monkeypatch.setenv("SUPABASE_URL", supabase_settings.url)
    monkeypatch.setenv("SUPABASE_ANON_KEY", supabase_settings.anon_key)
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", supabase_settings.service_role_key)
    monkeypatch.setenv("APP_PIN", "2468")

    user_a, user_b = secure_route_users
    client = TestClient(app)

    create_a = client.post("/api/secure/transactions", headers=_auth(user_a), json={
        "type": "expense",
        "category": "food",
        "amount": 101,
        "date": "2026-10-11",
        "note": "DIRECT_USER_A_ONLY",
    })
    create_b = client.post("/api/secure/transactions", headers=_auth(user_b), json={
        "type": "expense",
        "category": "food",
        "amount": 202,
        "date": "2026-10-11",
        "note": "DIRECT_USER_B_ONLY",
    })
    forged = client.post("/api/secure/transactions", headers=_auth(user_a), json={
        "type": "expense",
        "category": "food",
        "amount": 303,
        "date": "2026-10-11",
        "note": "DIRECT_FORGED_OWNER",
        "user_id": user_b.id,
    })

    assert create_a.status_code == 200, create_a.text
    assert create_b.status_code == 200, create_b.text
    assert forged.status_code == 200, forged.text

    budget_a = client.post("/api/secure/budgets", headers=_auth(user_a), json={
        "category": "food",
        "amount": 1000,
        "period": "monthly",
        "start_date": "2026-10-01",
        "user_id": user_b.id,
    })
    budget_b = client.post("/api/secure/budgets", headers=_auth(user_b), json={
        "category": "food",
        "amount": 2000,
        "period": "monthly",
        "start_date": "2026-10-01",
    })

    assert budget_a.status_code == 200, budget_a.text
    assert budget_b.status_code == 200, budget_b.text
    budget_a_id = budget_a.json()["id"]

    user_a_rows = _transactions(client.get("/api/secure/data", headers=_auth(user_a)))
    user_b_rows = _transactions(client.get("/api/secure/data", headers=_auth(user_b)))
    user_a_notes = {row["note"] for row in user_a_rows}
    user_b_notes = {row["note"] for row in user_b_rows}

    assert {"DIRECT_USER_A_ONLY", "DIRECT_FORGED_OWNER"} <= user_a_notes
    assert "DIRECT_USER_B_ONLY" not in user_a_notes
    assert {"DIRECT_USER_B_ONLY"} <= user_b_notes
    assert "DIRECT_USER_A_ONLY" not in user_b_notes
    assert "DIRECT_FORGED_OWNER" not in user_b_notes

    user_a_budgets = _budgets(client.get("/api/secure/budgets", headers=_auth(user_a)))
    user_b_budgets = _budgets(client.get("/api/secure/budgets", headers=_auth(user_b)))
    assert {budget["amount"] for budget in user_a_budgets} == {1000.0}
    assert {budget["amount"] for budget in user_b_budgets} == {2000.0}

    user_a_transaction = next(row for row in user_a_rows if row["note"] == "DIRECT_USER_A_ONLY")

    patch_other = client.patch(
        f"/api/secure/transactions/{user_a_transaction['id']}",
        headers=_auth(user_b),
        json={"note": "DIRECT_STOLEN_BY_B"},
    )
    delete_other = client.delete(
        f"/api/secure/transactions/{user_a_transaction['id']}",
        headers=_auth(user_b),
    )

    assert patch_other.status_code == 404
    assert delete_other.status_code == 404

    patch_other_budget = client.patch(
        f"/api/secure/budgets/{budget_a_id}",
        headers=_auth(user_b),
        json={"amount": 9999},
    )
    delete_other_budget = client.delete(
        f"/api/secure/budgets/{budget_a_id}",
        headers=_auth(user_b),
    )

    assert patch_other_budget.status_code == 404
    assert delete_other_budget.status_code == 404

    user_a_after = _transactions(client.get("/api/secure/data", headers=_auth(user_a)))
    user_a_after_notes = {row["note"] for row in user_a_after}
    assert "DIRECT_USER_A_ONLY" in user_a_after_notes
    assert "DIRECT_STOLEN_BY_B" not in user_a_after_notes
    user_a_budgets_after = _budgets(client.get("/api/secure/budgets", headers=_auth(user_a)))
    assert {budget["amount"] for budget in user_a_budgets_after} == {1000.0}

    assert client.get("/api/secure/data").status_code == 401
    assert client.get(
        "/api/secure/data",
        headers={"Authorization": "Bearer invalid-local-token"},
    ).status_code == 401
    assert client.get(
        "/api/data",
        headers={"x-pin": "2468", "Authorization": f"Bearer {user_b.access_token}"},
    ).status_code == 403
