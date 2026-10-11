from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWKClientError

try:
    from .config import SupabaseSettings, get_supabase_settings
except ImportError:
    from config import SupabaseSettings, get_supabase_settings


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: str | None
    claims: dict[str, Any]
    access_token: str


class AuthTokenError(Exception):
    pass


class SupabaseJWTVerifier:
    def __init__(self, settings: SupabaseSettings):
        if not settings.jwt_issuer or not settings.jwks_url:
            raise AuthTokenError("Supabase authentication is not configured.")

        self.audience = settings.jwt_audience
        self.issuer = settings.jwt_issuer
        self.jwk_client = PyJWKClient(settings.jwks_url)

    def verify(self, token: str) -> AuthenticatedUser:
        try:
            signing_key = self.jwk_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience=self.audience,
                issuer=self.issuer,
                options={"require": ["aud", "exp", "iss", "sub"]},
            )
        except ExpiredSignatureError as exc:
            raise AuthTokenError("Token has expired.") from exc
        except (InvalidTokenError, PyJWKClientError) as exc:
            raise AuthTokenError("Token is invalid.") from exc

        user_id = claims.get("sub")
        if not isinstance(user_id, str) or not user_id.strip():
            raise AuthTokenError("Token is missing a subject.")

        email = claims.get("email")
        return AuthenticatedUser(
            user_id=user_id,
            email=email if isinstance(email, str) else None,
            claims=claims,
            access_token=token,
        )


def get_supabase_jwt_verifier() -> SupabaseJWTVerifier:
    return SupabaseJWTVerifier(get_supabase_settings())


def _unauthorized(detail: str = "Invalid or missing authentication token.") -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise _unauthorized("Missing bearer authentication token.")

    if credentials.scheme.lower() != "bearer" or not credentials.credentials.strip():
        raise _unauthorized("Malformed bearer authentication token.")

    try:
        verifier = get_supabase_jwt_verifier()
        return verifier.verify(credentials.credentials)
    except AuthTokenError as exc:
        raise _unauthorized(str(exc)) from exc
