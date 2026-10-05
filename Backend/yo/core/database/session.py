from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from yo.core.database.engine import engine


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_database_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as database_session:
        try:
            yield database_session
            await database_session.commit()
        except Exception:
            await database_session.rollback()
            raise
        finally:
            await database_session.close()
