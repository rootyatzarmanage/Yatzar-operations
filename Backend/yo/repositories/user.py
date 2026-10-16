from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from yo.models.employee import Employee
from yo.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_active(self, *, user_id: UUID | None = None, identifier: str | None = None):
        query = select(User).options(
            joinedload(User.employee).joinedload(Employee.workspaces),
            joinedload(User.role),
        ).where(User.is_active.is_(True), User.deleted_at.is_(None))
        if user_id is not None:
            query = query.where(User.id == user_id)
        else:
            query = query.where(or_(
                User.email == identifier.strip().lower(),
                User.username == identifier.strip(),
            ))
        result = await self.session.execute(query)
        return result.unique().scalar_one_or_none()
