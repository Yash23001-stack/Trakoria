from backend import db


def post_transaction(client, auth_headers, payload):
    return client.post("/api/transactions", headers=auth_headers, json=payload)


def test_create_valid_expense_uses_isolated_database(client, auth_headers, tmp_path):
    response = post_transaction(client, auth_headers, {
        "type": "expense",
        "category": "food",
        "amount": 450,
        "date": "2026-10-07",
        "note": "Lunch",
    })

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    assert "expenses.db" not in db.DB_NAME
    assert tmp_path.as_posix().lower().replace("/", "\\") in db.DB_NAME.lower()

    data = client.get("/api/data", headers=auth_headers).json()
    assert data["transactions"][0]["type"] == "expense"
    assert data["transactions"][0]["category"] == "food"
    assert data["transactions"][0]["amount"] == 450
    assert data["transactions"][0]["note"] == "Lunch"


def test_create_valid_income(client, auth_headers):
    response = post_transaction(client, auth_headers, {
        "type": "income",
        "category": "other",
        "amount": 75000,
        "date": "2026-10-07",
        "note": "Salary",
    })

    assert response.status_code == 200
    data = client.get("/api/data", headers=auth_headers).json()
    assert data["transactions"][0]["type"] == "income"
    assert data["transactions"][0]["amount"] == 75000


def test_missing_amount_is_rejected(client, auth_headers):
    response = post_transaction(client, auth_headers, {
        "type": "expense",
        "category": "food",
        "date": "2026-10-07",
    })

    assert response.status_code == 422
    assert db.all_rows() == []


def test_invalid_amount_is_rejected(client, auth_headers):
    response = post_transaction(client, auth_headers, {
        "type": "expense",
        "category": "food",
        "amount": 0,
        "date": "2026-10-07",
    })

    assert response.status_code == 422
    assert db.all_rows() == []


def test_invalid_type_is_rejected(client, auth_headers):
    response = post_transaction(client, auth_headers, {
        "type": "transfer",
        "category": "food",
        "amount": 100,
        "date": "2026-10-07",
    })

    assert response.status_code == 422
    assert db.all_rows() == []


def test_invalid_category_is_rejected(client, auth_headers):
    response = post_transaction(client, auth_headers, {
        "type": "expense",
        "category": "not-a-category",
        "amount": 100,
        "date": "2026-10-07",
    })

    assert response.status_code == 422
    assert response.json()["detail"] == "Invalid transaction category"
    assert db.all_rows() == []


def test_invalid_date_is_rejected(client, auth_headers):
    response = post_transaction(client, auth_headers, {
        "type": "expense",
        "category": "food",
        "amount": 100,
        "date": "07-10-2026",
    })

    assert response.status_code == 422
    assert db.all_rows() == []


def test_optional_note_defaults_to_category(client, auth_headers):
    response = post_transaction(client, auth_headers, {
        "type": "expense",
        "category": "travel",
        "amount": 100,
        "date": "2026-10-07",
    })

    assert response.status_code == 200
    assert db.all_rows()[0]["note"] == "travel"


def test_unauthorized_transaction_create_is_rejected(client):
    response = client.post("/api/transactions", headers={"x-pin": "wrong"}, json={
        "type": "expense",
        "category": "food",
        "amount": 100,
        "date": "2026-10-07",
    })

    assert response.status_code == 401
    assert db.all_rows() == []
