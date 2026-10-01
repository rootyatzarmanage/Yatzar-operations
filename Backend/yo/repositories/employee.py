from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from yo.models.employee import Employee
from yo.models.user import User


class EmployeeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, employee: Employee) -> Employee:
        self.session.add(employee)
        await self.session.flush()
        await self.session.refresh(employee)
        return employee

    async def get_by_id(self, employee_id: UUID) -> Employee | None:
        result = await self.session.execute(
            select(Employee).options(joinedload(Employee.user).joinedload(User.role)).where(
                Employee.id == employee_id, Employee.deleted_at.is_(None)
            )
        )
        return result.scalars().first()

    async def get_by_code(self, employee_code: str) -> Employee | None:
        result = await self.session.execute(select(Employee).where(Employee.employee_code == employee_code))
        return result.scalars().first()

    async def list_all(self, skip: int, limit: int) -> Sequence[Employee]:
        result = await self.session.execute(
            select(Employee).options(joinedload(Employee.user).joinedload(User.role)).where(Employee.deleted_at.is_(None)).order_by(Employee.created_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().unique().all()

    async def update(self, employee: Employee) -> Employee:
        await self.session.flush()
        await self.session.refresh(employee)
        return employee

    async def soft_delete(self, employee: Employee) -> None:
        employee.deleted_at = datetime.now(timezone.utc)
        employee.user.is_active = False
        await self.session.flush()