from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.database.session import get_database_session


DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]
