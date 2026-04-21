from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.models.transaction import TransactionType, TransactionCategory


class SMSParseRequest(BaseModel):
    sms_text: str
    received_at: Optional[datetime] = None
    sender: Optional[str] = None


class SMSBatchItem(BaseModel):
    sms_text: str
    received_at: Optional[datetime] = None
    sender: Optional[str] = None


class SMSBatchRequest(BaseModel):
    messages: list[SMSBatchItem] = Field(..., max_length=500)


class SMSBatchResponse(BaseModel):
    received: int
    saved: int
    duplicates: int
    unparseable: int
    saved_ids: list[UUID]


class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    type: TransactionType
    category: Optional[TransactionCategory] = None
    merchant: Optional[str] = None
    description: Optional[str] = None
    transacted_at: datetime
    bank: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    amount: float
    type: TransactionType
    category: TransactionCategory
    merchant: Optional[str]
    description: Optional[str]
    bank: Optional[str]
    is_fraud_flagged: bool
    ml_confidence: Optional[float]
    transacted_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int


class MonthlySummary(BaseModel):
    month: int
    year: int
    total_debit: float
    total_credit: float
    net: float
    category_breakdown: dict[str, float]
    top_merchants: list[dict]
