import json
import os
import uuid
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request

import pytest


PLACEHOLDER_VALUES = {
    "",
    "https://your-project.supabase.co",
    "your-public-anon-key",
    "server-only-service-role-key",
}


@dataclass(frozen=True)
class SupabaseLocalSettings:
    url: str
    anon_key: str
    service_role_key: str


@dataclass(frozen=True)
class SupabaseUser:
    id: str
    email: str
    access_token: str


@dataclass(frozen=True)
class HttpResponse:
    status: int
    body: Any


def _configured(value: str | None) -> bool:
    return value is not None and value.strip() not in PLACEHOLDER_VALUES


@pytest.fixture(scope="module")
def supabase_settings() -> SupabaseLocalSettings:
    url = os.getenv("SUPABASE_URL") or os.getenv("LOCAL_SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("LOCAL_SUPABASE_ANON_KEY")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
        "LOCAL_SUPABASE_SERVICE_ROLE_KEY"
    )

    if not all(_configured(value) for value in [url, anon_key, service_role_key]):
        pytest.skip(
            "Local Supabase RLS integration tests require SUPABASE_URL, "
            "SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY."
        )

    return SupabaseLocalSettings(
        url=url.rstrip("/"),
        anon_key=anon_key,
        service_role_key=service_role_key,
    )


def _headers(api_key: str, bearer: str | None = None) -> dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {bearer or api_key}",
        "Content-Type": "application/json",
    }


def _http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    payload: Any | None = None,
) -> HttpResponse:
    encoded = None
    if payload is not None:
        encoded = json.dumps(payload).encode("utf-8")

    req = request.Request(url, data=encoded, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=10) as response:
            raw_body = response.read().decode("utf-8")
            body = json.loads(raw_body) if raw_body else None
            return HttpResponse(status=response.status, body=body)
    except error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8")
        try:
            body = json.loads(raw_body) if raw_body else None
        except json.JSONDecodeError:
            body = raw_body
        return HttpResponse(status=exc.code, body=body)
    except OSError as exc:
        pytest.skip(f"Local Supabase is not reachable: {exc}")


def _rest_url(settings: SupabaseLocalSettings, table: str, query: str = "") -> str:
    url = f"{settings.url}/rest/v1/{table}"
    return f"{url}?{query}" if query else url


def _auth_url(settings: SupabaseLocalSettings, path: str) -> str:
    return f"{settings.url}/auth/v1/{path.lstrip('/')}"


def _postgrest_headers(
    settings: SupabaseLocalSettings,
    user: SupabaseUser | None = None,
    *,
    service_role: bool = False,
    prefer: str | None = None,
) -> dict[str, str]:
    if service_role:
        headers = _headers(settings.service_role_key)
    else:
        assert user is not None
        headers = _headers(settings.anon_key, user.access_token)

    if prefer:
        headers["Prefer"] = prefer

    return headers


def _create_user(settings: SupabaseLocalSettings, label: str) -> SupabaseUser:
    password = f"Trakoria-{uuid.uuid4()}-Pass"
    email = f"trakoria-{label}-{uuid.uuid4().hex}@example.test"

    signup = _http_json(
        "POST",
        _auth_url(settings, "signup"),
        headers=_headers(settings.anon_key),
        payload={"email": email, "password": password},
    )
    assert signup.status in {200, 201}, signup.body
    user_id = signup.body["user"]["id"]

    signin = _http_json(
        "POST",
        _auth_url(settings, "token?grant_type=password"),
        headers=_headers(settings.anon_key),
        payload={"email": email, "password": password},
    )
    assert signin.status == 200, signin.body
    return SupabaseUser(id=user_id, email=email, access_token=signin.body["access_token"])


def _insert(
    settings: SupabaseLocalSettings,
    table: str,
    user: SupabaseUser,
    payload: dict[str, Any],
) -> dict[str, Any]:
    response = _http_json(
        "POST",
        _rest_url(settings, table),
        headers=_postgrest_headers(settings, user, prefer="return=representation"),
        payload=payload,
    )
    assert response.status == 201, response.body
    assert len(response.body) == 1
    return response.body[0]


def _select_by_id(
    settings: SupabaseLocalSettings,
    table: str,
    user: SupabaseUser,
    row_id: str,
) -> list[dict[str, Any]]:
    response = _http_json(
        "GET",
        _rest_url(settings, table, f"id=eq.{parse.quote(row_id)}&select=*"),
        headers=_postgrest_headers(settings, user),
    )
    assert response.status == 200, response.body
    return response.body


def _patch_by_id(
    settings: SupabaseLocalSettings,
    table: str,
    user: SupabaseUser,
    row_id: str,
    payload: dict[str, Any],
) -> HttpResponse:
    return _http_json(
        "PATCH",
        _rest_url(settings, table, f"id=eq.{parse.quote(row_id)}"),
        headers=_postgrest_headers(settings, user, prefer="return=representation"),
        payload=payload,
    )


def _delete_by_id(
    settings: SupabaseLocalSettings,
    table: str,
    user: SupabaseUser,
    row_id: str,
) -> HttpResponse:
    return _http_json(
        "DELETE",
        _rest_url(settings, table, f"id=eq.{parse.quote(row_id)}"),
        headers=_postgrest_headers(settings, user, prefer="return=representation"),
    )


def _assert_rejected(response: HttpResponse) -> None:
    assert response.status in {400, 401, 403, 409}, response.body


@pytest.fixture(scope="module")
def rls_users(supabase_settings: SupabaseLocalSettings):
    users: list[SupabaseUser] = []
    try:
        users = [
            _create_user(supabase_settings, "user-a"),
            _create_user(supabase_settings, "user-b"),
        ]
        yield users[0], users[1]
    finally:
        for table in ["budgets", "transactions", "categories"]:
            for user in users:
                _http_json(
                    "DELETE",
                    _rest_url(supabase_settings, table, f"user_id=eq.{user.id}"),
                    headers=_postgrest_headers(supabase_settings, service_role=True),
                )

        for user in users:
            _http_json(
                "DELETE",
                _auth_url(supabase_settings, f"admin/users/{user.id}"),
                headers=_headers(supabase_settings.service_role_key),
            )


@pytest.fixture()
def owned_expense_categories(
    supabase_settings: SupabaseLocalSettings,
    rls_users: tuple[SupabaseUser, SupabaseUser],
) -> tuple[dict[str, Any], dict[str, Any]]:
    user_a, user_b = rls_users
    suffix = uuid.uuid4().hex[:10]
    category_a = _insert(
        supabase_settings,
        "categories",
        user_a,
        {
            "user_id": user_a.id,
            "name": f"RLS Expense A {suffix}",
            "type": "expense",
        },
    )
    category_b = _insert(
        supabase_settings,
        "categories",
        user_b,
        {
            "user_id": user_b.id,
            "name": f"RLS Expense B {suffix}",
            "type": "expense",
        },
    )
    return category_a, category_b


def test_categories_rls_enforces_cross_user_ownership(
    supabase_settings: SupabaseLocalSettings,
    rls_users: tuple[SupabaseUser, SupabaseUser],
):
    user_a, user_b = rls_users
    suffix = uuid.uuid4().hex[:10]
    category_a = _insert(
        supabase_settings,
        "categories",
        user_a,
        {"user_id": user_a.id, "name": f"RLS Category A {suffix}", "type": "expense"},
    )
    category_b = _insert(
        supabase_settings,
        "categories",
        user_b,
        {"user_id": user_b.id, "name": f"RLS Category B {suffix}", "type": "expense"},
    )

    assert _select_by_id(supabase_settings, "categories", user_a, category_a["id"])[0][
        "user_id"
    ] == user_a.id
    assert _select_by_id(supabase_settings, "categories", user_a, category_b["id"]) == []

    cross_user_insert = _http_json(
        "POST",
        _rest_url(supabase_settings, "categories"),
        headers=_postgrest_headers(supabase_settings, user_a, prefer="return=representation"),
        payload={
            "user_id": user_b.id,
            "name": f"RLS Forged Category {suffix}",
            "type": "expense",
        },
    )
    _assert_rejected(cross_user_insert)

    _assert_rejected(
        _patch_by_id(
            supabase_settings,
            "categories",
            user_a,
            category_a["id"],
            {"user_id": user_b.id},
        )
    )

    update_other = _patch_by_id(
        supabase_settings,
        "categories",
        user_a,
        category_b["id"],
        {"name": f"RLS Stolen Category {suffix}"},
    )
    assert update_other.status == 200, update_other.body
    assert update_other.body == []

    delete_other = _delete_by_id(supabase_settings, "categories", user_a, category_b["id"])
    assert delete_other.status == 200, delete_other.body
    assert delete_other.body == []
    assert _select_by_id(supabase_settings, "categories", user_b, category_b["id"])[0][
        "name"
    ] == category_b["name"]


def test_transactions_rls_enforces_cross_user_ownership(
    supabase_settings: SupabaseLocalSettings,
    rls_users: tuple[SupabaseUser, SupabaseUser],
    owned_expense_categories: tuple[dict[str, Any], dict[str, Any]],
):
    user_a, user_b = rls_users
    category_a, category_b = owned_expense_categories
    transaction_a = _insert(
        supabase_settings,
        "transactions",
        user_a,
        {
            "user_id": user_a.id,
            "category_id": category_a["id"],
            "amount": 125.50,
            "currency": "INR",
            "type": "expense",
            "transaction_date": "2026-10-10",
            "note": "RLS user A transaction",
        },
    )
    transaction_b = _insert(
        supabase_settings,
        "transactions",
        user_b,
        {
            "user_id": user_b.id,
            "category_id": category_b["id"],
            "amount": 225.50,
            "currency": "INR",
            "type": "expense",
            "transaction_date": "2026-10-10",
            "note": "RLS user B transaction",
        },
    )

    assert _select_by_id(
        supabase_settings, "transactions", user_a, transaction_a["id"]
    )[0]["user_id"] == user_a.id
    assert _select_by_id(supabase_settings, "transactions", user_a, transaction_b["id"]) == []

    cross_user_insert = _http_json(
        "POST",
        _rest_url(supabase_settings, "transactions"),
        headers=_postgrest_headers(supabase_settings, user_a, prefer="return=representation"),
        payload={
            "user_id": user_b.id,
            "category_id": category_b["id"],
            "amount": 99.99,
            "currency": "INR",
            "type": "expense",
            "transaction_date": "2026-10-10",
        },
    )
    _assert_rejected(cross_user_insert)

    _assert_rejected(
        _patch_by_id(
            supabase_settings,
            "transactions",
            user_a,
            transaction_a["id"],
            {"user_id": user_b.id, "category_id": category_b["id"]},
        )
    )

    update_other = _patch_by_id(
        supabase_settings,
        "transactions",
        user_a,
        transaction_b["id"],
        {"note": "RLS stolen transaction"},
    )
    assert update_other.status == 200, update_other.body
    assert update_other.body == []

    delete_other = _delete_by_id(supabase_settings, "transactions", user_a, transaction_b["id"])
    assert delete_other.status == 200, delete_other.body
    assert delete_other.body == []
    assert _select_by_id(supabase_settings, "transactions", user_b, transaction_b["id"])[0][
        "note"
    ] == transaction_b["note"]


def test_budgets_rls_enforces_cross_user_ownership(
    supabase_settings: SupabaseLocalSettings,
    rls_users: tuple[SupabaseUser, SupabaseUser],
    owned_expense_categories: tuple[dict[str, Any], dict[str, Any]],
):
    user_a, user_b = rls_users
    category_a, category_b = owned_expense_categories
    budget_a = _insert(
        supabase_settings,
        "budgets",
        user_a,
        {
            "user_id": user_a.id,
            "category_id": category_a["id"],
            "amount": 5000,
            "currency": "INR",
            "period": "monthly",
            "start_date": "2026-10-01",
        },
    )
    budget_b = _insert(
        supabase_settings,
        "budgets",
        user_b,
        {
            "user_id": user_b.id,
            "category_id": category_b["id"],
            "amount": 7000,
            "currency": "INR",
            "period": "monthly",
            "start_date": "2026-10-01",
        },
    )

    assert _select_by_id(supabase_settings, "budgets", user_a, budget_a["id"])[0][
        "user_id"
    ] == user_a.id
    assert _select_by_id(supabase_settings, "budgets", user_a, budget_b["id"]) == []

    cross_user_insert = _http_json(
        "POST",
        _rest_url(supabase_settings, "budgets"),
        headers=_postgrest_headers(supabase_settings, user_a, prefer="return=representation"),
        payload={
            "user_id": user_b.id,
            "category_id": category_b["id"],
            "amount": 9000,
            "currency": "INR",
            "period": "yearly",
            "start_date": "2026-10-01",
        },
    )
    _assert_rejected(cross_user_insert)

    _assert_rejected(
        _patch_by_id(
            supabase_settings,
            "budgets",
            user_a,
            budget_a["id"],
            {"user_id": user_b.id, "category_id": category_b["id"]},
        )
    )

    update_other = _patch_by_id(
        supabase_settings,
        "budgets",
        user_a,
        budget_b["id"],
        {"amount": 1},
    )
    assert update_other.status == 200, update_other.body
    assert update_other.body == []

    delete_other = _delete_by_id(supabase_settings, "budgets", user_a, budget_b["id"])
    assert delete_other.status == 200, delete_other.body
    assert delete_other.body == []
    assert _select_by_id(supabase_settings, "budgets", user_b, budget_b["id"])[0][
        "amount"
    ] == budget_b["amount"]
