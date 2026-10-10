from pathlib import Path

from backend.config import get_supabase_settings
from backend.postgres.connection import get_postgres_settings

MIGRATION = Path("supabase/migrations/001_initial_schema.sql")


def migration_sql() -> str:
    return MIGRATION.read_text(encoding="utf-8").lower()


def test_initial_schema_migration_exists():
    assert MIGRATION.exists()


def test_core_tables_and_required_columns_exist():
    sql = migration_sql()

    for table in ["categories", "transactions", "budgets"]:
        assert f"create table public.{table}" in sql
        assert "id uuid primary key default gen_random_uuid()" in sql
        assert "user_id uuid not null references auth.users(id) on delete cascade" in sql
        assert "created_at timestamptz not null default now()" in sql
        assert "updated_at timestamptz not null default now()" in sql

    assert "category_id uuid not null references public.categories(id) on delete restrict" in sql
    assert "transaction_date date not null" in sql
    assert "category_id uuid not null references public.categories(id) on delete cascade" in sql
    assert "start_date date not null" in sql


def test_money_uses_numeric_not_float_or_real():
    sql = migration_sql()

    assert "amount numeric(12, 2) not null check (amount > 0)" in sql
    assert "amount real" not in sql
    assert "amount float" not in sql
    assert "amount double" not in sql


def test_type_and_budget_period_constraints_exist():
    sql = migration_sql()

    assert "type text not null check (type in ('income', 'expense'))" in sql
    assert "period text not null check (period in ('weekly', 'monthly', 'yearly', 'custom'))" in sql
    assert "check (end_date is null or end_date >= start_date)" in sql


def test_default_categories_are_seeded_per_user():
    sql = migration_sql()

    assert "create or replace function public.create_default_categories_for_user" in sql
    assert "after insert on auth.users" in sql
    assert "execute function public.handle_new_auth_user()" in sql

    for category in ["salary", "bonus", "extra income"]:
        assert f"'{category}', 'income', true" in sql

    for category in [
        "food",
        "drink",
        "petrol",
        "travel",
        "shopping",
        "bills",
        "rent",
        "entertainment",
        "health",
        "other",
    ]:
        assert f"'{category}', 'expense', true" in sql


def test_uniqueness_and_indexes_exist():
    sql = migration_sql()

    assert "categories_user_type_name_unique" in sql
    assert "on public.categories (user_id, type, lower(name))" in sql
    assert "transactions_user_date_idx" in sql
    assert "transactions_user_category_idx" in sql
    assert "budgets_user_category_period_start_unique" in sql
    assert "budgets_user_period_idx" in sql


def test_foreign_key_guard_triggers_exist():
    sql = migration_sql()

    assert "ensure_owned_category_matches_transaction" in sql
    assert "category_owner <> new.user_id" in sql
    assert "category_type <> new.type" in sql
    assert "transactions_category_guard" in sql
    assert "ensure_owned_category_matches_budget" in sql
    assert "category_type <> 'expense'" in sql
    assert "budgets_category_guard" in sql


def test_rls_is_enabled_for_financial_tables():
    sql = migration_sql()

    for table in ["categories", "transactions", "budgets"]:
        assert f"alter table public.{table} enable row level security" in sql


def test_rls_policies_scope_crud_to_auth_uid():
    sql = migration_sql()

    for table in ["categories", "transactions", "budgets"]:
        assert f"create policy {table}_select_own" in sql
        assert f"on public.{table} for select" in sql
        assert "using (user_id = auth.uid())" in sql
        assert f"create policy {table}_insert_own" in sql
        assert f"on public.{table} for insert" in sql
        assert "with check (user_id = auth.uid())" in sql
        assert f"create policy {table}_update_own" in sql
        assert f"on public.{table} for update" in sql
        assert f"create policy {table}_delete_own" in sql
        assert f"on public.{table} for delete" in sql


def test_client_supplied_user_id_cannot_bypass_rls_design():
    sql = migration_sql()

    assert sql.count("with check (user_id = auth.uid())") >= 3
    assert "auth.uid()" in sql


def test_supabase_settings_are_loaded_from_environment(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service")
    monkeypatch.setenv("SUPABASE_DATABASE_URL", "postgresql://example")

    settings = get_supabase_settings()

    assert settings.url == "https://example.supabase.co"
    assert settings.anon_key == "anon"
    assert settings.service_role_key == "service"
    assert settings.database_url == "postgresql://example"
    assert settings.is_configured is True


def test_postgres_connection_layer_does_not_open_network_connections(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL", raising=False)

    settings = get_postgres_settings()

    assert settings.is_configured is False
