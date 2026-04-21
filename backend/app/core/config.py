from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "FinPilot AI"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://finpilot:finpilot@localhost:5432/finpilot_db"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-secrets-manager"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # LLM
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "gemini"  # "openai" | "gemini"
    LLM_MODEL: str = "gemini-1.5-flash"

    # Redis (for caching + background jobs)
    REDIS_URL: str = "redis://localhost:6379"

    # Firebase (for push notifications)
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
