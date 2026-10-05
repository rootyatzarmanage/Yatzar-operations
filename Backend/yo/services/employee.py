from typing import Sequence
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.exceptions import ConflictException, NotFoundException
from yo.core.security import hash_password
from yo.models.employee import Employee
from yo.models.permission import Role
from yo.models.user import User
from yo.repositories.employee import EmployeeRepository
from yo.schemas.requests.employee import EmployeeCreateRequest, EmployeeUpdateRequest


class EmployeeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repository = EmployeeRepository(session)

    async def _ensure_unique_user(self, username: str, email: str, current_user_id: UUID | None = None) -> None:
        query = select(User.id).where((User.username == username) | (User.email == email))
        if current_user_id is not None:
            query = query.where(User.id != current_user_id)
        existing_user_id = await self.session.scalar(query.limit(1))
        if existing_user_id is not None:
            raise ConflictException("Username or login email is already in use.")

    def _new_code(self) -> str:
        return f"EMP-{uuid4().hex[:10].upper()}"

    async def create(self, request: EmployeeCreateRequest) -> Employee:
        await self._ensure_unique_user(request.username, request.login_email)
        employee_code = request.employee_code or self._new_code()
        if await self.repository.get_by_code(employee_code):
            raise ConflictException("Employee code is already in use.")
        role = await self.session.scalar(select(Role).where(Role.name == request.role, Role.deleted_at.is_(None)))
        if not role:
            raise ConflictException(f"Role '{request.role}' does not exist.")
        user = User(username=request.username, email=request.login_email, password_hash=hash_password(request.password), role=role, is_active=request.is_active)
        employee_values = request.model_dump(exclude={"employee_code", "username", "login_email", "password", "role", "is_active"})
        employee = Employee(user=user, employee_code=employee_code, **employee_values)
        return await self.repository.create(employee)

    async def get_by_id(self, employee_id: UUID) -> Employee:
        employee = await self.repository.get_by_id(employee_id)
        if not employee:
            raise NotFoundException("Employee", str(employee_id))
        return employee

    async def list_all(self, skip: int = 0, limit: int = 50) -> Sequence[Employee]:
        return await self.repository.list_all(skip, limit)

    async def update(self, employee_id: UUID, request: EmployeeUpdateRequest) -> Employee:
        employee = await self.get_by_id(employee_id)
        values = request.model_dump(exclude_unset=True)
        user_values = {key: values.pop(key) for key in ("username", "login_email", "password", "role", "is_active") if key in values}
        employee_code = values.pop("employee_code", None)
        if employee_code is not None and employee_code != employee.employee_code:
            existing_employee = await self.repository.get_by_code(employee_code)
            if existing_employee and existing_employee.id != employee.id:
                raise ConflictException("Employee code is already in use.")
            employee.employee_code = employee_code
        if "username" in user_values or "login_email" in user_values:
            await self._ensure_unique_user(user_values.get("username", employee.user.username), user_values.get("login_email", employee.user.email), employee.user.id)
        for key, value in values.items():
            setattr(employee, key, value)
        if "username" in user_values:
            employee.user.username = user_values["username"]
        if "login_email" in user_values:
            employee.user.email = user_values["login_email"]
        if "password" in user_values:
            employee.user.password_hash = hash_password(user_values["password"])
        if "role" in user_values:
            role = await self.session.scalar(select(Role).where(Role.name == user_values["role"], Role.deleted_at.is_(None)))
            if not role:
                raise ConflictException(f"Role '{user_values['role']}' does not exist.")
            employee.user.role = role
        if "is_active" in user_values:
            employee.user.is_active = user_values["is_active"]
        return await self.repository.update(employee)

    async def delete(self, employee_id: UUID) -> None:
        await self.repository.soft_delete(await self.get_by_id(employee_id))