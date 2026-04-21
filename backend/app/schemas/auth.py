from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class RegisterRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+91[6-9]\d{9}$", description="Indian mobile: +91XXXXXXXXXX")
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)
    email: Optional[EmailStr] = None
    monthly_income: Optional[float] = Field(None, gt=0)
    city: Optional[str] = None


class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
