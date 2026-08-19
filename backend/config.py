from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql://sail_admin:sail2026@localhost:5432/sail_platform"

    # Security
    SECRET_KEY: str = "change-this-secret-key-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Email (Mailcatcher for development)
    MAIL_SERVER: str = "mailcatcher"
    MAIL_PORT: int = 2525
    MAIL_USE_TLS: bool = False
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str = "noreply@sail.local"

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://sail.local",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Stripe
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings():
    """Cached settings instance for performance."""
    return Settings()

# Backward-compatible settings export
settings = get_settings()