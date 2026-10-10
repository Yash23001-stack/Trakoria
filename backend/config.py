import os
from dataclasses import dataclass


@dataclass(frozen=True)
class SupabaseSettings:
    url: str | None
    anon_key: str | None
    service_role_key: str | None
    database_url: str | None

    @property
    def is_configured(self) -> bool:
        return bool(self.url and self.anon_key and self.database_url)


def get_supabase_settings() -> SupabaseSettings:
    return SupabaseSettings(
        url=os.getenv("SUPABASE_URL"),
        anon_key=os.getenv("SUPABASE_ANON_KEY"),
        service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        database_url=os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL"),
    )
