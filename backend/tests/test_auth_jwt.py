from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.exceptions import PyJWKClientError

from backend import auth
from backend.auth import AuthTokenError, AuthenticatedUser, SupabaseJWTVerifier
from backend.config import SupabaseSettings


def _settings() -> SupabaseSettings:
    return SupabaseSettings(
        url="http://127.0.0.1:56000",
        anon_key="local-anon-key",
        service_role_key=None,
        database_url=None,
        jwt_audience="authenticated",
    )


def _key_pair() -> tuple[bytes, bytes]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


class FakeJWKClient:
    def __init__(self, public_key: bytes | Exception):
        self.public_key = public_key

    def get_signing_key_from_jwt(self, token: str):
        if isinstance(self.public_key, Exception):
            raise self.public_key

        return SimpleNamespace(key=self.public_key)


def _token(private_key: bytes, **claim_overrides):
    now = datetime.now(timezone.utc)
    claims = {
        "aud": "authenticated",
        "email": "jane@example.com",
        "exp": now + timedelta(minutes=10),
        "iat": now,
        "iss": "http://127.0.0.1:56000/auth/v1",
        "sub": "8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa",
    }
    claims.update(claim_overrides)
    return jwt.encode(claims, private_key, algorithm="RS256", headers={"kid": "local-test-key"})


def _verifier(public_key: bytes) -> SupabaseJWTVerifier:
    verifier = SupabaseJWTVerifier(_settings())
    verifier.jwk_client = FakeJWKClient(public_key)
    return verifier


def test_supabase_jwt_verifier_accepts_valid_signed_token():
    private_key, public_key = _key_pair()

    user = _verifier(public_key).verify(_token(private_key))

    assert user.user_id == "8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa"
    assert user.email == "jane@example.com"
    assert user.claims["aud"] == "authenticated"


def test_supabase_jwt_verifier_rejects_wrong_audience():
    private_key, public_key = _key_pair()
    token = _token(private_key, aud="anon")

    try:
        _verifier(public_key).verify(token)
    except AuthTokenError as exc:
        assert "invalid" in str(exc).lower()
    else:
        raise AssertionError("Expected wrong-audience token to be rejected")


def test_supabase_jwt_verifier_rejects_wrong_issuer():
    private_key, public_key = _key_pair()
    token = _token(private_key, iss="https://other-project.supabase.co/auth/v1")

    try:
        _verifier(public_key).verify(token)
    except AuthTokenError as exc:
        assert "invalid" in str(exc).lower()
    else:
        raise AssertionError("Expected wrong-issuer token to be rejected")


def test_supabase_jwt_verifier_rejects_expired_token():
    private_key, public_key = _key_pair()
    token = _token(private_key, exp=datetime.now(timezone.utc) - timedelta(minutes=1))

    try:
        _verifier(public_key).verify(token)
    except AuthTokenError as exc:
        assert "expired" in str(exc).lower()
    else:
        raise AssertionError("Expected expired token to be rejected")


def test_supabase_jwt_verifier_rejects_invalid_signature():
    private_key, public_key = _key_pair()
    other_private_key, _other_public_key = _key_pair()

    try:
        _verifier(public_key).verify(_token(other_private_key))
    except AuthTokenError as exc:
        assert "invalid" in str(exc).lower()
    else:
        raise AssertionError("Expected invalid-signature token to be rejected")


def test_supabase_jwt_verifier_fails_closed_when_jwks_key_lookup_fails():
    private_key, public_key = _key_pair()
    verifier = _verifier(public_key)
    verifier.jwk_client = FakeJWKClient(PyJWKClientError("Unable to find a signing key"))

    try:
        verifier.verify(_token(private_key))
    except AuthTokenError as exc:
        assert "invalid" in str(exc).lower()
    else:
        raise AssertionError("Expected JWKS lookup failure to reject the token")


def test_supabase_jwt_verifier_rejects_unexpected_algorithm():
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "aud": "authenticated",
            "exp": now + timedelta(minutes=10),
            "iat": now,
            "iss": "http://127.0.0.1:56000/auth/v1",
            "sub": "8d9bbdf8-1b5d-4c77-92a6-e8ab0a0fbdfa",
        },
        "not-a-supabase-signing-key-with-enough-length",
        algorithm="HS256",
        headers={"kid": "unexpected-hmac-key"},
    )
    _private_key, public_key = _key_pair()

    try:
        _verifier(public_key).verify(token)
    except AuthTokenError as exc:
        assert "invalid" in str(exc).lower()
    else:
        raise AssertionError("Expected unexpected-algorithm token to be rejected")


class FakeVerifier:
    def __init__(self, result: AuthenticatedUser | Exception):
        self.result = result
        self.tokens: list[str] = []

    def verify(self, token: str) -> AuthenticatedUser:
        self.tokens.append(token)
        if isinstance(self.result, Exception):
            raise self.result

        return self.result


def test_auth_me_returns_safe_identity_from_verified_token(client, monkeypatch):
    verifier = FakeVerifier(
        AuthenticatedUser(
            user_id="token-user-id",
            email="token-user@example.com",
            claims={"sub": "token-user-id", "role": "authenticated"},
            access_token="verified-token",
        )
    )
    monkeypatch.setattr(auth, "get_supabase_jwt_verifier", lambda: verifier)

    response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": "Bearer verified-token",
            "x-user-id": "frontend-supplied-user-id",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "user_id": "token-user-id",
        "email": "token-user@example.com",
    }
    assert verifier.tokens == ["verified-token"]


def test_auth_me_rejects_missing_bearer_token(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer authentication token."


def test_auth_me_rejects_malformed_authorization_header(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Basic abc"})

    assert response.status_code == 401


def test_auth_me_rejects_invalid_bearer_token(client, monkeypatch):
    monkeypatch.setattr(
        auth,
        "get_supabase_jwt_verifier",
        lambda: FakeVerifier(AuthTokenError("Token is invalid.")),
    )

    response = client.get("/api/auth/me", headers={"Authorization": "Bearer bad-token"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Token is invalid."


def test_auth_me_rejects_expired_bearer_token(client, monkeypatch):
    monkeypatch.setattr(
        auth,
        "get_supabase_jwt_verifier",
        lambda: FakeVerifier(AuthTokenError("Token has expired.")),
    )

    response = client.get("/api/auth/me", headers={"Authorization": "Bearer expired-token"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Token has expired."
