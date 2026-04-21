from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.db.repositories.user import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)

    if await repo.get_by_phone(payload.phone):
        raise HTTPException(status_code=409, detail="Phone already registered")

    if payload.email and await repo.get_by_email(payload.email):
        raise HTTPException(status_code=409, detail="Email already registered")

    user = await repo.create(
        phone=payload.phone,
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        monthly_income=payload.monthly_income,
        city=payload.city,
    )

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    repo = UserRepository(db)
    user = await repo.get_by_phone(payload.phone)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if token_data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    return TokenResponse(
        access_token=create_access_token(token_data["sub"]),
        refresh_token=create_refresh_token(token_data["sub"]),
    )
