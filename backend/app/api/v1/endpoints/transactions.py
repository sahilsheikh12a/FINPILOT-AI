from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.transaction_service import TransactionService
from app.db.repositories.transaction import TransactionRepository
from app.schemas.transaction import (
    SMSParseRequest, TransactionCreate, TransactionResponse,
    TransactionListResponse, MonthlySummary,
    SMSBatchRequest, SMSBatchResponse,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/parse-sms", response_model=TransactionResponse | dict)
async def parse_sms(
    payload: SMSParseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = TransactionService(db)
    txn = await svc.parse_and_save_sms(current_user.id, payload)
    if not txn:
        return {"message": "SMS does not appear to be a transaction", "parsed": False}
    return TransactionResponse.model_validate(txn)


@router.post("/parse-sms/batch", response_model=SMSBatchResponse)
async def parse_sms_batch(
    payload: SMSBatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = TransactionService(db)
    result = await svc.parse_and_save_sms_batch(current_user.id, payload)
    return SMSBatchResponse(**result)


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = TransactionService(db)
    txn = await svc.create_manual(current_user.id, payload)
    return TransactionResponse.model_validate(txn)


@router.get("/", response_model=TransactionListResponse)
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TransactionRepository(db)
    from app.models.transaction import TransactionCategory
    cat = None
    if category:
        try:
            cat = TransactionCategory(category)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    items = await repo.get_user_transactions(
        current_user.id,
        start=start_date,
        end=end_date,
        category=cat,
        limit=page_size,
        offset=(page - 1) * page_size,
    )
    return TransactionListResponse(
        items=[TransactionResponse.model_validate(t) for t in items],
        total=len(items),
        page=page,
        page_size=page_size,
    )


@router.get("/summary/monthly", response_model=MonthlySummary)
async def monthly_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2024),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = TransactionService(db)
    data = await svc.get_monthly_summary(current_user.id, month, year)
    return MonthlySummary(
        month=data["month"],
        year=data["year"],
        total_debit=data["total_debit"],
        total_credit=0,
        net=0 - data["total_debit"],
        category_breakdown=data["category_breakdown"],
        top_merchants=[],
    )
