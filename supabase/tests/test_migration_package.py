"""Offline source-contract tests, NOT PostgreSQL execution or ACL integration tests.

Run explicitly from the repository root with the command in the checklist. This
directory avoids backend/tests/conftest.py, application imports and dotenv loading.
"""

import hashlib
from pathlib import Path
import re
import socket

import pytest


ROOT = Path(__file__).resolve().parents[2]
INITIAL = ROOT / "supabase/migrations/001_initial_schema.sql"
HARDENING = ROOT / "supabase/migrations/002_foundation_hardening.sql"
BACKFILL = ROOT / "supabase/review/003_backfill_default_categories.sql.draft"
PREVIEW = ROOT / "supabase/review/preview_default_categories.sql"
FUNCTIONS = (
    "set_updated_at()",
    "ensure_owned_category_matches_transaction()",
    "ensure_owned_category_matches_budget()",
    "create_default_categories_for_user(uuid)",
    "handle_new_auth_user()",
)
EXPECTED = {
    ("Salary", "income"), ("Bonus", "income"),
    ("Extra Income", "income"), ("Other", "income"),
    ("Food", "expense"), ("Drink", "expense"),
    ("Petrol", "expense"), ("Travel", "expense"),
    ("Shopping", "expense"), ("Bills", "expense"),
    ("Rent", "expense"), ("Entertainment", "expense"),
    ("Health", "expense"), ("Other", "expense"),
}


@pytest.fixture(autouse=True)
def deny_network(monkeypatch):
    def denied(*args, **kwargs):
        raise AssertionError("Network access is forbidden in migration source tests")

    monkeypatch.setattr(socket, "create_connection", denied)
    monkeypatch.setattr(socket.socket, "connect", denied)
    monkeypatch.setattr(socket.socket, "connect_ex", denied)


def source(path):
    return re.sub(r"--[^\n]*", "", path.read_text(encoding="utf-8"))


def compact(path):
    return " ".join(source(path).lower().split())


def defaults(path):
    return re.findall(
        r"\(\s*(?:target_user_id\s*,\s*)?'([^']+)'\s*,\s*"
        r"'(income|expense)'(?:\s*,\s*true)?\s*\)",
        source(path),
    )


def test_initial_matches_committed_baseline_with_portable_line_endings():
    # Separately verify the raw working-tree hash before/after this task.
    canonical = INITIAL.read_bytes().replace(b"\r\n", b"\n")
    assert hashlib.sha256(canonical).hexdigest() == (
        "10739112628e7740662f7ac75f04a4d7002b4a21dd5eb55f310bc3765492a340"
    )


def test_backfill_cannot_be_picked_up_by_normal_migration_discovery():
    migrations = set((ROOT / "supabase/migrations").glob("*.sql"))
    assert HARDENING in migrations
    assert BACKFILL.exists() and BACKFILL not in migrations
    assert PREVIEW.exists() and PREVIEW not in migrations
    assert not any(p.name.startswith("003_") for p in migrations)


@pytest.mark.parametrize("path", [HARDENING, BACKFILL, PREVIEW])
def test_all_default_sets_are_exact_and_unique(path):
    rows = defaults(path)
    assert len(rows) == 14
    assert set(rows) == EXPECTED
    assert len([row for row in rows if row[1] == "income"]) == 4


@pytest.mark.parametrize("signature", FUNCTIONS)
def test_every_foundation_function_has_a_trusted_search_path(signature):
    sql = compact(HARDENING)
    if signature.startswith("create_default_categories"):
        definition = sql.split("create or replace function", 1)[1].split("$$;", 1)[0]
        assert "security definer set search_path = pg_catalog, pg_temp" in definition
        assert "insert into public.categories" in definition
    else:
        assert (
            f"alter function public.{signature} set search_path = pg_catalog, pg_temp;"
            in sql
        )


def test_signup_uses_trusted_owner_without_replacing_the_auth_trigger():
    sql = compact(HARDENING)
    initial = compact(INITIAL)
    assert "current_user <> 'postgres'" in sql
    assert "p.proowner = 'postgres'::regrole" in sql
    assert "c.relowner = 'postgres'::regrole" in sql
    assert "grant select, insert on table public.categories to postgres;" in sql
    assert "alter function public.handle_new_auth_user() security definer;" in sql
    assert "perform public.create_default_categories_for_user(new.id);" in initial
    assert not re.search(r"\b(?:drop|create)\s+trigger\b", sql)
    assert "'postgres', 'public.handle_new_auth_user()', 'execute'" in sql


def test_internal_execution_is_revoked_from_clients_and_service_role():
    sql = compact(HARDENING)
    function_revoke = re.search(r"revoke all privileges on function (.*?);", sql)[1]
    for signature in FUNCTIONS:
        assert f"public.{signature}" in function_revoke
    targets = function_revoke.rsplit(" from ", 1)[1]
    assert targets == "public, anon, authenticated, authenticator, service_role"
    assert "grant execute on function %s to service_role" not in sql
    assert "unexpected api/service_role foundation function execution" in sql


def test_service_preservation_covers_only_table_and_column_rights():
    sql = compact(HARDENING)
    snapshot = sql.index("create temporary table trakoria_002_service_acl")
    assert snapshot < sql.index("create or replace function")
    assert "on commit drop as" in sql
    snapshot_sql = sql[snapshot:sql.index("create or replace function")]
    assert "has_function_privilege" not in snapshot_sql
    assert "'function'" not in snapshot_sql
    for kind in ("table", "column"):
        assert f"when '{kind}' then has_{kind}_privilege" in sql
    assert "when 'function' then" not in sql
    assert "saved.object_kind = 'function'" not in sql
    assert "s.allowed is distinct from case s.object_kind" in sql
    assert "where allowed loop" in sql
    assert "grant %s (%i) on table %s to service_role" in sql
    assert "rolname = 'service_role' and rolbypassrls" in sql
    table_revoke = re.search(r"revoke all privileges on table (.*?);", sql)[1]
    assert "service_role" not in table_revoke.rsplit(" from ", 1)[1]


def test_effective_execution_denial_is_independent_of_the_table_column_snapshot():
    sql = compact(HARDENING)
    denial = re.search(
        r"if exists \(select 1 from pg_roles r cross join pg_proc p (.*?) then",
        sql,
    )[1]
    assert "('anon', 'authenticated', 'authenticator', 'service_role')" in denial
    assert "has_function_privilege(r.oid, p.oid, 'execute')" in denial
    for signature in FUNCTIONS:
        assert f"to_regprocedure('public.{signature}')" in denial
    assert "trakoria_002_service_acl" not in denial


def test_trusted_postgres_execution_grants_cover_all_five_functions():
    sql = compact(HARDENING)
    grant = re.search(r"grant execute on function (.*?);", sql)[1]
    assert grant.endswith("to postgres")
    for signature in FUNCTIONS:
        assert f"public.{signature}" in grant
    assert "service_role" not in grant


def test_ordinary_application_roles_have_only_the_reviewed_table_access():
    sql = compact(HARDENING)
    assert "grant select on table public.categories to authenticated;" in sql
    assert (
        "grant select, insert, update, delete on table public.transactions, "
        "public.budgets to authenticated;" in sql
    )
    for operation in ("insert", "update", "delete"):
        assert f"drop policy categories_{operation}_own on public.categories;" in sql
    assert "unexpected effective ordinary api table privileges" in sql
    assert "unexpected effective ordinary api column privileges" in sql
    assert "pg_has_role(r.oid, 'service_role'::regrole, 'set')" in sql


def test_all_remaining_policies_explicitly_restate_owner_checks():
    statements = re.findall(r"alter policy .*?;", compact(HARDENING))
    assert len(statements) == 9
    for statement in statements:
        assert "to authenticated" in statement
        if "_insert_" in statement or "_update_" in statement:
            assert "with check (user_id = auth.uid())" in statement
        if "_insert_" not in statement:
            assert "using (user_id = auth.uid())" in statement
    assert "unexpected financial policies require reconciliation" in compact(HARDENING)


def test_hardening_does_not_backfill_or_weaken_database_boundaries():
    sql = compact(HARDENING)
    assert "from auth.users" not in sql
    assert "insert into public.categories" in sql  # Only the target-user helper body.
    assert not re.search(
        r"\b(?:drop table|delete from|truncate table|disable row level security|"
        r"alter default privileges|alter role|alter table .*? owner to)\b", sql
    )
    assert not re.search(r"(?:^|;)\s*(?:begin|commit|rollback)\s*;", sql)


def test_preview_is_read_only_and_preserves_matching_user_defined_categories():
    sql = compact(PREVIEW)
    assert not re.search(r"\b(insert|update|delete|create|alter|drop|grant|revoke|execute|perform)\b", sql)
    assert "count(distinct user_id) as affected_users" in sql
    assert "count(*) as missing_category_rows" in sql
    assert "lower(c.name) = lower(e.name)" in sql
    assert "c.type = e.type" in sql
    assert "c.is_default" not in sql


def test_backfill_is_insert_only_and_conflicts_do_not_modify_existing_rows():
    sql = compact(BACKFILL)
    assert sql.count("insert into public.categories") == 1
    assert "on conflict (user_id, type, (lower(name))) do nothing;" in sql
    assert "where not exists" in sql
    assert "c.type = e.type" in sql and "lower(c.name) = lower(e.name)" in sql
    assert not re.search(r"\b(update|delete|truncate|create|alter|drop)\b", sql)
    assert "c.is_default" not in sql
