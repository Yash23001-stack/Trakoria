from backend.config import SupabaseSettings, get_supabase_settings


def get_postgres_settings() -> SupabaseSettings:
    """Return PostgreSQL/Supabase settings without opening a connection yet."""
    return get_supabase_settings()
