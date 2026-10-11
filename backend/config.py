import os
from dataclasses import dataclass


@dataclass(frozen=True)
class SupabaseSettings:
    url: str | None
    anon_key: str | None
    service_role_key: str | None
    database_url: str | None
    jwt_audience: str

    @property
    def is_configured(self) -> bool:
        return bool(self.url and self.anon_key and self.database_url)

    @property
    def normalized_url(self) -> str | None:
        return self.url.rstrip("/") if self.url else None

    @property
    def jwt_issuer(self) -> str | None:
        if not self.normalized_url:
            return None

        return f"{self.normalized_url}/auth/v1"

    @property
    def jwks_url(self) -> str | None:
        if not self.normalized_url:
            return None

        return f"{self.normalized_url}/auth/v1/.well-known/jwks.json"


def get_supabase_settings() -> SupabaseSettings:
    return SupabaseSettings(
        url=os.getenv("SUPABASE_URL"),
        anon_key=os.getenv("SUPABASE_ANON_KEY"),
        service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        database_url=os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL"),
        jwt_audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
    )
