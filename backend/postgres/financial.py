from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any
from urllib.parse import quote

import requests
from fastapi import HTTPException

try:
    from ..auth import AuthenticatedUser
    from ..config import SupabaseSettings, get_supabase_settings
    from ..schemas import BudgetCreate, BudgetUpdate, TransactionCreate, TransactionUpdate
except ImportError:
    from auth import AuthenticatedUser
    from config import SupabaseSettings, get_supabase_settings
    from schemas import BudgetCreate, BudgetUpdate, TransactionCreate, TransactionUpdate


@dataclass(frozen=True)
class SupabaseRestClient:
    settings: SupabaseSettings
    user: AuthenticatedUser

    def __post_init__(self):
        if not self.settings.normalized_url or not self.settings.anon_key:
            raise HTTPException(status_code=503, detail="Supabase financial storage is not configured.")

    @property
    def rest_url(self) -> str:
        return f"{self.settings.normalized_url}/rest/v1"

    @property
    def headers(self) -> dict[str, str]:
        return {
            "apikey": self.settings.anon_key or "",
            "Authorization": f"Bearer {self.user.access_token}",
        }

    def request(self, method: str, path: str, **kwargs):
        headers = {
            **self.headers,
            **kwargs.pop("headers", {}),
        }
        response = requests.request(
            method,
            f"{self.rest_url}/{path.lstrip('/')}",
            headers=headers,
            timeout=10,
            **kwargs,
        )

        if response.status_code in {401, 403}:
            raise HTTPException(status_code=response.status_code, detail="Supabase authorization failed.")

        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail="Supabase financial storage request failed.")

        return response


def get_financial_client(user: AuthenticatedUser) -> SupabaseRestClient:
    return SupabaseRestClient(get_supabase_settings(), user)


def _json(response) -> list[dict[str, Any]]:
    data = response.json()
    return data if isinstance(data, list) else []


def _affected_rows(response, detail: str = "Transaction not found") -> list[dict[str, Any]]:
    rows = _json(response)
    if not rows:
        raise HTTPException(status_code=404, detail=detail)

    return rows


def _require_rows(rows: list[dict[str, Any]], detail: str = "Record not found") -> list[dict[str, Any]]:
    if not rows:
        raise HTTPException(status_code=404, detail=detail)

    return rows


def _money(value: Any) -> float:
    return float(Decimal(str(value or "0")))


def _category_name(category: dict[str, Any] | None) -> str:
    if not category:
        return "other"
    return str(category.get("name") or "other").lower()


def list_categories(client: SupabaseRestClient) -> list[dict[str, Any]]:
    return _json(client.request(
        "GET",
        "categories?select=id,name,type&order=name.asc",
    ))


def list_budgets(client: SupabaseRestClient) -> list[dict[str, Any]]:
    return _json(client.request(
        "GET",
        "budgets?select=id,amount,period,start_date,end_date,categories(id,name,type)&order=start_date.desc",
    ))


def list_transactions(client: SupabaseRestClient) -> list[dict[str, Any]]:
    return _json(client.request(
        "GET",
        "transactions?select=id,transaction_date,amount,note,type,categories(id,name,type)&order=transaction_date.desc",
    ))


def dashboard_data(client: SupabaseRestClient) -> dict[str, Any]:
    transaction_rows = list_transactions(client)
    budget_rows = list_budgets(client)
    transactions = [
        {
            "id": row["id"],
            "date": row["transaction_date"],
            "category": _category_name(row.get("categories")),
            "amount": _money(row["amount"]),
            "note": row.get("note") or "",
            "type": row["type"],
        }
        for row in transaction_rows
    ]
    budgets = {
        _category_name(row.get("categories")): _money(row["amount"])
        for row in budget_rows
        if row.get("categories")
    }

    return {
        "config": {
            "currency": "₹",
            "monthlyBudget": sum(budgets.values()) if budgets else 0,
            "budgets": budgets,
            "budgetItems": [_budget_payload(row, transactions) for row in budget_rows if row.get("categories")],
        },
        "transactions": transactions,
    }


def _budget_payload(row: dict[str, Any], transactions: list[dict[str, Any]]) -> dict[str, Any]:
    category = _category_name(row.get("categories"))
    spent = sum(
        _money(txn["amount"])
        for txn in transactions
        if str(txn.get("type", "")).lower() == "expense"
        and str(txn.get("category", "")).lower() == category
    )
    amount = _money(row["amount"])

    return {
        "id": row["id"],
        "category": category,
        "amount": amount,
        "period": row["period"],
        "start_date": row["start_date"],
        "end_date": row.get("end_date"),
        "spent": spent,
        "remaining": amount - spent,
    }


def budget_payload(client: SupabaseRestClient) -> dict[str, Any]:
    transactions = [
        {
            "category": _category_name(row.get("categories")),
            "amount": _money(row["amount"]),
            "type": row["type"],
        }
        for row in list_transactions(client)
    ]
    return {
        "budgets": [
            _budget_payload(row, transactions)
            for row in list_budgets(client)
            if row.get("categories")
        ]
    }


def _find_category(client: SupabaseRestClient, name: str, txn_type: str) -> dict[str, Any]:
    normalized = name.strip().lower()
    for category in list_categories(client):
        if str(category.get("name", "")).lower() == normalized and category.get("type") == txn_type:
            return category

    raise HTTPException(status_code=422, detail="Invalid transaction category")


def create_transaction(client: SupabaseRestClient, transaction: TransactionCreate) -> dict[str, str]:
    category = _find_category(client, transaction.category, transaction.type)
    payload = {
        "user_id": client.user.user_id,
        "category_id": category["id"],
        "amount": transaction.amount,
        "type": transaction.type,
        "transaction_date": transaction.date.isoformat(),
        "note": transaction.note or transaction.category,
    }
    client.request(
        "POST",
        "transactions",
        headers={"Content-Type": "application/json", "Prefer": "return=minimal"},
        json=payload,
    )
    return {"status": "success"}


def create_budget(client: SupabaseRestClient, budget: BudgetCreate) -> dict[str, Any]:
    category = _find_category(client, budget.category, "expense")
    response = client.request(
        "POST",
        "budgets?select=id,amount,period,start_date,end_date,categories(id,name,type)",
        headers={"Content-Type": "application/json", "Prefer": "return=representation"},
        json={
            "user_id": client.user.user_id,
            "category_id": category["id"],
            "amount": budget.amount,
            "period": budget.period,
            "start_date": budget.start_date.isoformat(),
            "end_date": budget.end_date.isoformat() if budget.end_date else None,
        },
    )
    return _budget_payload(_affected_rows(response)[0], [])


def update_budget(client: SupabaseRestClient, budget_id: str, budget: BudgetUpdate) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if budget.amount is not None:
        payload["amount"] = budget.amount
    if budget.period is not None:
        payload["period"] = budget.period
    if budget.start_date is not None:
        payload["start_date"] = budget.start_date.isoformat()
    if budget.end_date is not None:
        payload["end_date"] = budget.end_date.isoformat()
    if budget.category is not None:
        payload["category_id"] = _find_category(client, budget.category, "expense")["id"]

    if not payload:
        existing = _json(client.request(
            "GET",
            f"budgets?select=id,amount,period,start_date,end_date,categories(id,name,type)&id=eq.{quote(budget_id)}&limit=1",
        ))
        return _budget_payload(_require_rows(existing, "Budget not found")[0], [])

    response = client.request(
        "PATCH",
        f"budgets?id=eq.{quote(budget_id)}&select=id,amount,period,start_date,end_date,categories(id,name,type)",
        headers={"Content-Type": "application/json", "Prefer": "return=representation"},
        json=payload,
    )
    return _budget_payload(_affected_rows(response, "Budget not found")[0], [])


def delete_budget(client: SupabaseRestClient, budget_id: str) -> dict[str, str]:
    response = client.request(
        "DELETE",
        f"budgets?id=eq.{quote(budget_id)}&select=id",
        headers={"Prefer": "return=representation"},
    )
    _affected_rows(response, "Budget not found")
    return {"status": "success"}


def update_transaction(client: SupabaseRestClient, transaction_id: str, transaction: TransactionUpdate) -> dict[str, str]:
    payload: dict[str, Any] = {}
    if transaction.amount is not None:
        payload["amount"] = transaction.amount
    if transaction.date is not None:
        payload["transaction_date"] = transaction.date.isoformat()
    if transaction.note is not None:
        payload["note"] = transaction.note
    if transaction.type is not None:
        payload["type"] = transaction.type
    if transaction.category is not None:
        txn_type = transaction.type
        if txn_type is None:
            existing = _json(client.request(
                "GET",
                f"transactions?select=type&id=eq.{quote(transaction_id)}&limit=1",
            ))
            if not existing:
                raise HTTPException(status_code=404, detail="Transaction not found")
            txn_type = existing[0]["type"]
        payload["category_id"] = _find_category(client, transaction.category, txn_type)["id"]

    if not payload:
        return {"status": "success"}

    response = client.request(
        "PATCH",
        f"transactions?id=eq.{quote(transaction_id)}&select=id",
        headers={"Content-Type": "application/json", "Prefer": "return=representation"},
        json=payload,
    )
    _affected_rows(response)
    return {"status": "success"}


def delete_transaction(client: SupabaseRestClient, transaction_id: str) -> dict[str, str]:
    response = client.request(
        "DELETE",
        f"transactions?id=eq.{quote(transaction_id)}&select=id",
        headers={"Prefer": "return=representation"},
    )
    _affected_rows(response)
    return {"status": "success"}


def export_csv(client: SupabaseRestClient) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Category", "Amount", "Note", "Type"])
    for txn in dashboard_data(client)["transactions"]:
        writer.writerow([txn["id"], txn["date"], txn["category"], txn["amount"], txn["note"], txn["type"]])
    return output.getvalue()


def backup_json(client: SupabaseRestClient) -> dict[str, Any]:
    return dashboard_data(client)
