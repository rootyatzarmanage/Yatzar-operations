from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from yo.core.config import settings


if not settings.DATABASE_URL.startswith("postgresql+asyncpg://"):
    raise RuntimeError("DATABASE_URL must use the PostgreSQL asyncpg driver")


engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)
