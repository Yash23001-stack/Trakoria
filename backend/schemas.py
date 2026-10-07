from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    date: date
    category: str = Field(min_length=1)
    amount: float = Field(gt=0)
    note: str = ""
    type: Literal["income", "expense"]
    chat_id: int = 0
