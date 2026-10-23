from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Yatzar Operations API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/yo_db"
    DEFAULT_SUPER_ADMIN_USERNAME: str = "superadmin"
    DEFAULT_SUPER_ADMIN_EMAIL: str = "admin@yatzar.com"
    DEFAULT_SUPER_ADMIN_PASSWORD: str = "ChangeMe123!"
    SESSION_SECRET: str = "change-this-session-secret"
    SESSION_COOKIE_NAME: str = "yatzar_session"
    SESSION_MAX_AGE: int = 60 * 60 * 8
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FRONTEND_URL: str = "http://localhost:5173"
    PUBLIC_API_URL: str = "http://localhost:8000/api/v1"
    MAIL_MAILER: str = "smtp"
    MAIL_HOST: str = Field(default="", validation_alias=AliasChoices("MAIL_HOST", "SMTP_HOST"))
    MAIL_PORT: int = Field(default=587, validation_alias=AliasChoices("MAIL_PORT", "SMTP_PORT"))
    MAIL_USERNAME: str = Field(default="", validation_alias=AliasChoices("MAIL_USERNAME", "SMTP_USER"))
    MAIL_PASSWORD: str = Field(default="", validation_alias=AliasChoices("MAIL_PASSWORD", "SMTP_PASSWORD"))
    MAIL_ENCRYPTION: str = "TLS"
    MAIL_FROM_ADDRESS: str = Field(default="", validation_alias=AliasChoices("MAIL_FROM_ADDRESS", "SMTP_FROM"))
    MAIL_FROM_NAME: str = "Yatzar Operations"
    MAIL_TIMEOUT: float = Field(default=30, gt=0, le=120)
    MAIL_WORKER_ENABLED: bool = True
    MAIL_POLL_SECONDS: float = Field(default=30, ge=1)
    MAIL_MAX_ATTEMPTS: int = Field(default=5, ge=1)
    MAIL_TIMEZONE: str = "Asia/Kolkata"
    EMAIL_TRACKING_BASE_URL: str = "http://localhost:8000/api/v1/email-marketing"
    EMAIL_TRACKING_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
