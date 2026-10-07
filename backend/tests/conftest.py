import os

import pytest
from fastapi.testclient import TestClient

from backend import db
from backend.api import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    test_db = tmp_path / "trakoria_test.db"
    monkeypatch.setattr(db, "DB_NAME", str(test_db))
    monkeypatch.setenv("APP_PIN", "2468")
    db.init_db()
    return TestClient(app)


@pytest.fixture()
def auth_headers():
    return {"x-pin": os.environ.get("APP_PIN", "2468")}
