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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
