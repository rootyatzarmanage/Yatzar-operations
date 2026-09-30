from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.database.session import get_database_session


DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]


async def get_database_dependency() -> AsyncGenerator[AsyncSession, None]:
    """Provide a database session to FastAPI dependencies."""
    async for database_session in get_database_session():
        yield database_session
