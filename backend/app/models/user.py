import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    monthly_income: Mapped[float | None] = mapped_column(Numeric(12, 2))
    city: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="user", lazy="dynamic")
    budgets: Mapped[list["Budget"]] = relationship("Budget", back_populates="user", lazy="dynamic")
    goals: Mapped[list["Goal"]] = relationship("Goal", back_populates="user", lazy="dynamic")
    emis: Mapped[list["EMI"]] = relationship("EMI", back_populates="user", lazy="dynamic")
    subscriptions: Mapped[list["Subscription"]] = relationship("Subscription", back_populates="user", lazy="dynamic")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="user", lazy="dynamic")
