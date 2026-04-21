from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from uuid import UUID

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.alert import Alert
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.alert import AlertType

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertResponse(BaseModel):
    id: UUID
    type: AlertType
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[AlertResponse])
async def get_alerts(
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Alert).where(Alert.user_id == current_user.id).order_by(Alert.created_at.desc())
    if unread_only:
        q = q.where(Alert.is_read == False)
    result = await db.execute(q.limit(50))
    return [AlertResponse.model_validate(a) for a in result.scalars().all()]


@router.patch("/{alert_id}/read")
async def mark_read(
    alert_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Alert)
        .where(Alert.id == alert_id, Alert.user_id == current_user.id)
        .values(is_read=True)
    )
    return {"success": True}


@router.patch("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Alert)
        .where(Alert.user_id == current_user.id, Alert.is_read == False)
        .values(is_read=True)
    )
    return {"success": True}
