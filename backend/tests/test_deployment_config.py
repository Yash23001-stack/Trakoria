import pytest

from backend.config import get_cors_origins


def test_cors_origins_default_to_local_development(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    assert get_cors_origins() == [
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ]


def test_cors_origins_are_explicit_and_trimmed(monkeypatch):
    monkeypatch.setenv(
        "CORS_ORIGINS",
        " https://trakoria.pages.dev/ , https://trakoria-staging.pages.dev ",
    )

    assert get_cors_origins() == [
        "https://trakoria.pages.dev",
        "https://trakoria-staging.pages.dev",
    ]


def test_cors_origins_reject_wildcards(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")

    with pytest.raises(ValueError, match="wildcard"):
        get_cors_origins()


def test_health_endpoint_is_available(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
