from datetime import datetime, timezone
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
            joinedload(User.workspaces),
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

    async def update_password(self, user: User, password_hash: str) -> User:
        user.password_hash = password_hash
        user.password_changed_at = datetime.now(timezone.utc)
        user.updated_by = user.id
        await self.session.flush()
        return user

    async def get_by_email(self, email: str, exclude_user_id: UUID) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email, User.id != exclude_user_id)
        )
        return result.scalar_one_or_none()

    async def update_profile(self, user: User, values: dict, employee_values: dict) -> User:
        for key, value in values.items():
            setattr(user, key, value)
        if user.employee is not None:
            for key, value in employee_values.items():
                setattr(user.employee, key, value)
            user.employee.updated_by = user.id
        user.updated_by = user.id
        await self.session.flush()
        return user
