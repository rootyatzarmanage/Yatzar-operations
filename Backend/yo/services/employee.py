from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from yo.core.security import hash_password
from yo.models.employee import Employee
from yo.models.user import User
from yo.repositories.employee import EmployeeRepository
from yo.schemas.requests.employee import (
    EmployeeCreateRequest,
    EmployeeDraftRequest,
    EmployeeUpdateRequest,
)


class EmployeeService:
    ACCOUNT_FIELDS = {"username", "login_email", "password", "role", "is_active"}

    def __init__(self, repository: EmployeeRepository):
        self.repository = repository

    async def get_employee(
        self, employee_id: UUID | None = None, employee_code: str | None = None,
        status: int | None = None,
    ) -> Employee:
        if employee_id is not None:
            employee = await self.repository.get_employee(employee_id)
        elif employee_code is not None:
            employee = await self.repository.get_employee_by_code(employee_code)
        else:
            raise HTTPException(400, "Supply an employee ID or employee code.")
        if employee is None or (status is not None and employee.status != status):
            raise HTTPException(404, "Employee not found.")
        return employee

    async def list_employees(
        self, search: str | None = None, status: int | None = None,
        page: int = 1, per_page: int = 5,
    ):
        return await self.repository.list_employees(
            search=search, status=status, page=page, per_page=per_page,
        )

    async def get_drafts(
        self, employee_id: UUID | None = None, employee_code: str | None = None,
        search: str | None = None, page: int = 1, per_page: int = 5,
    ):
        if employee_id is not None or employee_code is not None:
            employee = await self.repository.get_draft(
                employee_id=employee_id, employee_code=employee_code,
            )
            if employee is None or employee.status != 0:
                raise HTTPException(404, "Employee draft not found.")
            return employee
        return await self.repository.list_drafts(search=search, page=page, per_page=per_page)

    async def get_employee_codes(self) -> list[str]:
        return await self.repository.get_employee_codes()

    async def _ensure_unique_code(self, code: str, employee_id: UUID | None = None):
        existing = await self.repository.get_employee_by_code(code, include_deleted=True)
        if existing is not None and existing.id != employee_id:
            raise HTTPException(409, "Employee code is already in use.")

    async def _ensure_unique_user(
        self, username: str, email: str, current_user_id: UUID | None = None,
    ):
        existing = await self.repository.get_user_by_username_or_email(
            username, email, current_user_id,
        )
        if existing is not None:
            raise HTTPException(409, "Username or login email is already in use.")

    async def _get_role(self, name: str):
        role = await self.repository.get_role_by_name(name)
        if role is None:
            raise HTTPException(400, f"Role '{name}' does not exist.")
        return role

    async def _persist(self, values: dict, employee=None, user_values=None):
        try:
            if employee is None:
                return await self.repository.create_employee(values)
            return await self.repository.update_employee(employee, values, user_values)
        except IntegrityError as exc:
            raise HTTPException(
                409, "Employee code, username, or login email conflicts with an existing record.",
            ) from exc

    async def _next_employee_code(self) -> str:
        prefix = f"EMP-{datetime.now().year}-"
        last_code = await self.repository.get_latest_code(prefix)
        next_number = int(last_code[len(prefix):]) + 1 if last_code else 1
        return f"{prefix}{next_number:04d}"

    async def _new_user(self, payload: EmployeeCreateRequest, user_id: UUID) -> User:
        await self._ensure_unique_user(payload.username, str(payload.login_email))
        role = await self._get_role(payload.role)
        return User(
            username=payload.username, email=str(payload.login_email),
            password_hash=hash_password(payload.password), role=role,
            is_active=payload.is_active, created_by=user_id, updated_by=user_id,
        )

    async def _get_workspaces(
        self,
        workspace_ids: list[UUID],
    ):
        if not workspace_ids:
            return []

        unique_ids = list(dict.fromkeys(workspace_ids))
        workspaces = await self.repository.get_workspaces_by_ids(unique_ids)

        if len(workspaces) != len(unique_ids):
            raise HTTPException(
                status_code=400,
                detail="One or more selected workspaces are invalid.",
            )

        return workspaces

    async def create_employee(self, payload: EmployeeCreateRequest, user_id: UUID):
        code = await self._next_employee_code()
        await self._ensure_unique_code(code)
        workspaces = await self._get_workspaces(payload.workspace_ids)
        user = await self._new_user(payload, user_id)
        user.workspaces = workspaces
        values = payload.model_dump(
            exclude=self.ACCOUNT_FIELDS | {"employee_code", "status", "workspace_ids"},
        )
        values.update(
            employee_code=code, status=1, user=user, workspaces=workspaces,
            created_by=user_id, updated_by=user_id,
        )
        return await self._persist(values)

    async def create_draft(self, payload: EmployeeDraftRequest, user_id: UUID):
        code = await self._next_employee_code()
        await self._ensure_unique_code(code)
        workspaces = await self._get_workspaces(payload.workspace_ids or [])
        values = payload.model_dump(
            exclude_unset=True, exclude=self.ACCOUNT_FIELDS | {"status", "workspace_ids"},
        )
        values.update(
            employee_code=code, status=0, workspaces=workspaces,
            created_by=user_id, updated_by=user_id,
        )
        return await self._persist(values)

    async def update_employee(
        self, employee_id: UUID, payload: EmployeeUpdateRequest, user_id: UUID,
    ):
        employee = await self.get_employee(employee_id=employee_id)
        values = payload.model_dump(exclude_unset=True)
        workspace_ids = values.pop("workspace_ids", None)
        if workspace_ids is not None:
            values["workspaces"] = await self._get_workspaces(workspace_ids)
        account = {key: values.pop(key) for key in self.ACCOUNT_FIELDS if key in values}
        if employee.status == 1:
            required = {
                name for name, field in EmployeeCreateRequest.model_fields.items()
                if field.is_required()
            }
            if any(value is None and key in required for key, value in {**values, **account}.items()):
                raise HTTPException(422, "Required saved employee fields cannot be null.")
        elif account:
            raise HTTPException(422, "Supply login details using the draft save endpoint.")
        if "is_active" in account and account["is_active"] is None:
            raise HTTPException(422, "is_active cannot be null.")

        user_values = {}
        if account:
            if employee.user is None:
                raise HTTPException(400, "Employee does not have a user account yet.")
            if "username" in account or "login_email" in account:
                await self._ensure_unique_user(
                    account.get("username", employee.user.username),
                    str(account.get("login_email", employee.user.email)), employee.user.id,
                )
            for key in ("username", "is_active"):
                if key in account:
                    user_values[key] = account[key]
            if "login_email" in account:
                user_values["email"] = str(account["login_email"])
            if "password" in account:
                user_values["password_hash"] = hash_password(account["password"])
            if "role" in account:
                user_values["role"] = await self._get_role(account["role"])
            user_values["updated_by"] = user_id
        if workspace_ids is not None and employee.user is not None:
            user_values["workspaces"] = values["workspaces"]
            user_values["updated_by"] = user_id
        values["updated_by"] = user_id
        return await self._persist(values, employee, user_values)

    async def save_draft(
        self, employee_id: UUID, payload: EmployeeCreateRequest, user_id: UUID,
    ):
        employee = await self.get_employee(employee_id=employee_id)
        if employee.status == 1:
            raise HTTPException(409, "Employee is already saved.")
        user = await self._new_user(payload, user_id)
        values = payload.model_dump(
            exclude=self.ACCOUNT_FIELDS | {"status", "workspace_ids"},
        )
        if "workspace_ids" in payload.model_fields_set:
            values["workspaces"] = await self._get_workspaces(payload.workspace_ids)
        user.workspaces = values.get("workspaces", employee.workspaces)
        values.update(user=user, status=1, updated_by=user_id)
        return await self._persist(values, employee)

    async def delete_employee(self, employee_id: UUID, user_id: UUID):
        employee = await self.get_employee(employee_id=employee_id)
        await self.repository.soft_delete_employee(employee, user_id)

    async def bulk_delete_employees(self, employee_ids: list[UUID], user_id: UUID):
        deleted_count = await self.repository.soft_delete_many(employee_ids, user_id)
        return {"deleted_count": deleted_count}

    async def get_employee_options(self):
        return await self.repository.get_employee_options()
