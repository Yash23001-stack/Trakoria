from backend import db


LEGACY_BLOCKED_DETAIL = "Legacy SQLite financial access is disabled until user-isolated storage is available."


def seed_transaction():
    db.add(
        "2026-10-07",
        "food",
        450,
        "seeded test row",
        "expense",
        12345,
    )


def test_dashboard_data_is_blocked_even_with_valid_pin(client, auth_headers):
    seed_transaction()

    response = client.get("/api/data", headers=auth_headers)

    assert response.status_code == 403
    assert response.json()["detail"] == LEGACY_BLOCKED_DETAIL
    assert len(db.all_rows()) == 1


def test_authenticated_account_switching_does_not_restore_legacy_data_access(client, auth_headers):
    seed_transaction()

    first_account_headers = {
        **auth_headers,
        "Authorization": "Bearer redacted-first-test-token",
    }
    second_account_headers = {
        **auth_headers,
        "Authorization": "Bearer redacted-second-test-token",
    }

    first_response = client.get("/api/data", headers=first_account_headers)
    second_response = client.get("/api/data", headers=second_account_headers)

    assert first_response.status_code == 403
    assert second_response.status_code == 403
    assert len(db.all_rows()) == 1


def test_transaction_create_is_blocked_and_does_not_mutate_sqlite(client, auth_headers):
    response = client.post("/api/transactions", headers=auth_headers, json={
        "type": "expense",
        "category": "food",
        "amount": 100,
        "date": "2026-10-07",
    })

    assert response.status_code == 403
    assert response.json()["detail"] == LEGACY_BLOCKED_DETAIL
    assert db.all_rows() == []


def test_transaction_delete_is_blocked_and_existing_data_remains(client, auth_headers):
    seed_transaction()
    transaction_id = db.all_rows()[0]["id"]

    response = client.delete(f"/api/transactions/{transaction_id}", headers=auth_headers)

    assert response.status_code == 403
    assert len(db.all_rows()) == 1


def test_export_is_blocked_even_with_valid_pin(client, auth_headers):
    seed_transaction()

    response = client.get("/api/export", headers=auth_headers)

    assert response.status_code == 403
    assert response.json()["detail"] == LEGACY_BLOCKED_DETAIL
    assert len(db.all_rows()) == 1


def test_backup_is_blocked_even_with_valid_pin(client, auth_headers):
    seed_transaction()

    response = client.get("/api/backup", headers=auth_headers)

    assert response.status_code == 403
    assert response.json()["detail"] == LEGACY_BLOCKED_DETAIL
    assert len(db.all_rows()) == 1


def test_wrong_pin_is_still_rejected_before_legacy_containment(client):
    response = client.get("/api/data", headers={"x-pin": "wrong"})

    assert response.status_code == 401
    assert db.all_rows() == []
