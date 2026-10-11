from datetime import date as date_type
from typing import Literal

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    date: date_type
    category: str = Field(min_length=1)
    amount: float = Field(gt=0)
    note: str = ""
    type: Literal["income", "expense"]
    chat_id: int = 0


class TransactionUpdate(BaseModel):
    date: date_type | None = None
    category: str | None = Field(default=None, min_length=1)
    amount: float | None = Field(default=None, gt=0)
    note: str | None = None
    type: Literal["income", "expense"] | None = None


class BudgetCreate(BaseModel):
    category: str = Field(min_length=1)
    amount: float = Field(gt=0)
    period: Literal["weekly", "monthly", "yearly", "custom"] = "monthly"
    start_date: date_type
    end_date: date_type | None = None


class BudgetUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1)
    amount: float | None = Field(default=None, gt=0)
    period: Literal["weekly", "monthly", "yearly", "custom"] | None = None
    start_date: date_type | None = None
    end_date: date_type | None = None
