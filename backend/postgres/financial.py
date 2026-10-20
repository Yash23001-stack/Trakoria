from __future__ import annotations

import csv
import io
import logging
import re
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


logger = logging.getLogger(__name__)
STORAGE_ERROR_DETAIL = "Supabase financial storage request failed."
_EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_BEARER_PATTERN = re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]+", re.IGNORECASE)
_JWT_PATTERN = re.compile(r"\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}\b")
_FILTER_PATTERN = re.compile(r"((?:^|[?&])[\w.]+=(?:eq|neq|gt|gte|lt|lte|like|ilike|in)\.)[^&]+")


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
        upstream_path = path.lstrip("/")
        headers = {
            **self.headers,
            **kwargs.pop("headers", {}),
        }
        try:
            response = requests.request(
                method,
                f"{self.rest_url}/{upstream_path}",
                headers=headers,
                timeout=10,
                **kwargs,
            )
            response.request_method = method.upper()
            response.request_path = upstream_path
        except requests.Timeout as exc:
            _log_storage_failure(method, upstream_path, reason="timeout", exc=exc)
            raise _storage_error() from exc
        except requests.RequestException as exc:
            _log_storage_failure(method, upstream_path, reason="request_exception", exc=exc)
            raise _storage_error() from exc

        if response.status_code >= 400:
            _log_storage_failure(
                method,
                upstream_path,
                status_code=response.status_code,
                reason="http_error",
                response=response,
            )
            raise _storage_error()

        return response


def _storage_error() -> HTTPException:
    return HTTPException(status_code=502, detail=STORAGE_ERROR_DETAIL)


def _redact(value: Any) -> str:
    text = str(value or "")
    text = _BEARER_PATTERN.sub("Bearer [REDACTED]", text)
    text = _JWT_PATTERN.sub("[REDACTED_JWT]", text)
    text = _EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    text = _FILTER_PATTERN.sub(r"\1[REDACTED]", text)
    return text[:300]


def _safe_upstream_error(response) -> dict[str, str | None]:
    try:
        payload = response.json()
    except ValueError:
        return {"code": None, "message": "non_json_error_response"}

    if not isinstance(payload, dict):
        return {"code": None, "message": "unexpected_error_shape"}

    code = payload.get("code") or payload.get("error_code") or payload.get("error")
    message = payload.get("message") or payload.get("msg") or payload.get("error_description")
    return {
        "code": _redact(code) if code else None,
        "message": _redact(message) if message else None,
    }


def _log_storage_failure(
    method: str,
    path: str,
    *,
    reason: str,
    status_code: int | None = None,
    response=None,
    exc: BaseException | None = None,
) -> None:
    import json

    safe_method = method.upper() if type(method) is str else "unknown"
    if safe_method not in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}:
        safe_method = "unknown"
    safe_path = path.split("?", 1)[0].split("#", 1)[0].strip("/").split("/", 1)[0] if type(path) is str else "unknown"
    if safe_path not in {"transactions", "budgets", "categories"}:
        safe_path = "unknown"
    safe_status = status_code if type(status_code) is int and 100 <= status_code <= 599 else None
    safe_reason = reason if type(reason) is str and reason in {
        "http_error", "timeout", "request_exception", "malformed_json", "unexpected_json_shape",
    } else "unknown"
    exception_types = {
        requests.RequestException, requests.Timeout, requests.ConnectTimeout, requests.ReadTimeout,
        requests.ConnectionError, requests.HTTPError, requests.TooManyRedirects,
        requests.exceptions.SSLError, requests.exceptions.ProxyError,
        requests.exceptions.InvalidURL, requests.exceptions.InvalidSchema,
        requests.exceptions.MissingSchema, requests.exceptions.InvalidHeader,
        requests.exceptions.JSONDecodeError, json.JSONDecodeError, ValueError,
    }
    safe_exception = type(exc).__name__ if type(exc) in exception_types else None
    # Accept known diagnostic codes only; never render arbitrary upstream strings.
    allowed_codes = {
        "PGRST000", "PGRST001", "PGRST002", "PGRST003", "PGRST100", "PGRST102",
        "PGRST103", "PGRST105", "PGRST106", "PGRST107", "PGRST108", "PGRST116",
        "PGRST200", "PGRST201", "PGRST202", "PGRST203", "PGRST204", "PGRST205",
        "PGRST300", "PGRST301", "PGRST302", "PGRST303",
        "42501", "42703", "42P01", "23502", "23503", "23505", "23514",
        "22P02", "22003", "57014", "53300",
    }
    safe_code = None
    if response is not None:
        try:
            payload = response.json()
            if type(payload) is dict:
                for field in ("code", "error_code", "error"):
                    candidate = payload.get(field)
                    if type(candidate) is str and candidate in allowed_codes:
                        safe_code = candidate
                        break
        except Exception:
            # Diagnostic parsing must not replace the original storage failure.
            pass
    logger.warning(
        "Supabase financial storage request failed method=%s table=%s status=%s code=%s reason=%s exception=%s",
        safe_method, safe_path, safe_status if safe_status is not None else "none",
        safe_code or "none", safe_reason, safe_exception or "none",
        extra={
            "upstream_method": safe_method,
            "upstream_path": safe_path,
            "upstream_status_code": safe_status,
            "upstream_error_code": safe_code,
            "upstream_failure_reason": safe_reason,
            "upstream_exception_type": safe_exception,
        },
    )


def get_financial_client(user: AuthenticatedUser) -> SupabaseRestClient:
    return SupabaseRestClient(get_supabase_settings(), user)


def _json(response) -> list[dict[str, Any]]:
    try:
        data = response.json()
    except ValueError as exc:
        _log_storage_failure(
            getattr(response, "request_method", "GET"),
            getattr(response, "request_path", getattr(response, "url", "unknown")),
            status_code=getattr(response, "status_code", None),
            reason="malformed_json",
            exc=exc,
        )
        raise _storage_error() from exc

    if not isinstance(data, list):
        _log_storage_failure(
            getattr(response, "request_method", "GET"),
            getattr(response, "request_path", getattr(response, "url", "unknown")),
            status_code=getattr(response, "status_code", None),
            reason="unexpected_json_shape",
        )
        raise _storage_error()

    return data


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
