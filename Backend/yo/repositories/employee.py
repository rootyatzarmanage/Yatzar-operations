from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import cast, func, or_, select, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from yo.models.employee import Employee
from yo.models.workspace import Workspace
from yo.models.permission import Role
from yo.models.user import User


class EmployeeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def _employee_query():
        return select(Employee).options(
            joinedload(Employee.user).joinedload(User.role),
            joinedload(Employee.workspaces),
        ).execution_options(populate_existing=True)

    async def get_employee(self, employee_id: UUID) -> Employee | None:
        result = await self.session.execute(
            self._employee_query().where(
                Employee.id == employee_id, Employee.deleted_at.is_(None)
            )
        )
        return result.unique().scalar_one_or_none()

    async def get_workspaces_by_ids(
        self,
        workspace_ids: list[UUID],
    ) -> list[Workspace]:
        if not workspace_ids:
            return []

        result = await self.session.execute(
            select(Workspace).where(
                Workspace.id.in_(workspace_ids),
                Workspace.deleted_at.is_(None),
                Workspace.status == "Enabled",
            )
        )

        return list(result.scalars().all())


    async def get_employee_by_code(
        self, employee_code: str, *, include_deleted: bool = False,
    ) -> Employee | None:
        query = self._employee_query().where(Employee.employee_code == employee_code)
        if not include_deleted:
            query = query.where(Employee.deleted_at.is_(None))
        result = await self.session.execute(query)
        return result.unique().scalar_one_or_none()

    async def list_employees(
        self,
        search: str | None = None,
        status: int | None = None,
        page: int = 1,
        per_page: int = 5,
    ) -> dict:
        conditions = [Employee.deleted_at.is_(None)]
        if status is not None:
            status_values = ("1", "active") if status == 1 else ("0", "draft")
            conditions.append(cast(Employee.status, String).in_(status_values))
        if search and search.strip():
            search_term = f"%{search.strip()}%"
            conditions.append(or_(
                Employee.employee_code.ilike(search_term),
                Employee.employee_name.ilike(search_term),
                Employee.display_name.ilike(search_term),
                Employee.email.ilike(search_term),
                Employee.mobile_number.ilike(search_term),
                Employee.department.ilike(search_term),
                Employee.designation.ilike(search_term),
                Employee.work_location.ilike(search_term),
                Employee.employment_status.ilike(search_term),
                User.username.ilike(search_term),
                User.email.ilike(search_term),
            ))
        # The outer join keeps drafts without a User in both count and results.
        total_result = await self.session.execute(
            select(func.count(Employee.id))
            .select_from(Employee).outerjoin(Employee.user).where(*conditions)
        )
        result = await self.session.execute(
            self._employee_query().outerjoin(Employee.user).where(*conditions)
            .order_by(Employee.created_at.desc(), Employee.id.desc())
            .offset((page - 1) * per_page).limit(per_page)
        )
        return {
            "items": result.scalars().unique().all(),
            "total": total_result.scalar_one(),
            "page": page,
            "per_page": per_page,
        }

    async def list_drafts(
        self, search: str | None = None, page: int = 1, per_page: int = 5,
    ) -> dict:
        return await self.list_employees(
            search=search, status=0, page=page, per_page=per_page,
        )

    async def get_draft(
        self, employee_id: UUID | None = None, employee_code: str | None = None,
    ) -> Employee | None:
        conditions = [Employee.deleted_at.is_(None), Employee.status == 0]
        if employee_id is not None:
            conditions.append(Employee.id == employee_id)
        elif employee_code is not None:
            conditions.append(Employee.employee_code == employee_code)
        else:
            return None
        result = await self.session.execute(self._employee_query().where(*conditions))
        return result.unique().scalar_one_or_none()

    async def get_employee_codes(self) -> list[str]:
        result = await self.session.execute(
            select(Employee.employee_code).where(
                Employee.deleted_at.is_(None), Employee.employee_code.is_not(None),
            ).order_by(Employee.employee_code.asc())
        )
        return list(result.scalars().all())

    async def get_latest_code(self, prefix: str) -> str | None:
        # Deleted rows still reserve codes through the table's unique constraint.
        result = await self.session.execute(
            select(Employee.employee_code).where(Employee.employee_code.like(f"{prefix}%"))
        )
        codes = [
            code for code in result.scalars()
            if code[len(prefix):].isascii() and code[len(prefix):].isdigit()
        ]
        return max(codes, key=lambda code: int(code[len(prefix):]), default=None)

    async def get_user_by_username_or_email(
        self, username: str, email: str, current_user_id: UUID | None = None,
    ) -> User | None:
        query = select(User).where(or_(User.username == username, User.email == email))
        if current_user_id is not None:
            query = query.where(User.id != current_user_id)
        result = await self.session.execute(query.limit(1))
        return result.unique().scalar_one_or_none()

    async def get_role_by_name(self, name: str) -> Role | None:
        result = await self.session.execute(
            select(Role).where(Role.name == name, Role.deleted_at.is_(None))
        )
        return result.unique().scalar_one_or_none()

    async def create_employee(self, values: dict) -> Employee:
        async with self.session.begin_nested():
            employee = Employee(**values)
            self.session.add(employee)
            await self.session.flush()
            return await self.get_employee(employee.id)

    async def update_employee(
        self, employee: Employee, values: dict, user_values: dict | None = None,
    ) -> Employee:
        async with self.session.begin_nested():
            for key, value in values.items():
                setattr(employee, key, value)
            for key, value in (user_values or {}).items():
                setattr(employee.user, key, value)
            await self.session.flush()
            return await self.get_employee(employee.id)

    async def soft_delete_employee(self, employee: Employee, user_id: UUID) -> None:
        employee.deleted_at = datetime.now(timezone.utc)
        employee.deleted_by = user_id
        if employee.user is not None:
            employee.user.is_active = False
        await self.session.flush()

    async def soft_delete_many(self, employee_ids: list[UUID], user_id: UUID) -> int:
        result = await self.session.execute(
            self._employee_query().where(
                Employee.id.in_(employee_ids), Employee.deleted_at.is_(None),
            )
        )
        employees = list(result.scalars().unique().all())
        deleted_at = datetime.now(timezone.utc)
        for employee in employees:
            employee.deleted_at = deleted_at
            employee.deleted_by = user_id
            if employee.user is not None:
                employee.user.is_active = False
        await self.session.flush()
        return len(employees)

    async def get_employee_options(self) -> dict:
        options = {}
        for key, column in (
            ("departments", Employee.department),
            ("designations", Employee.designation),
            ("work_locations", Employee.work_location),
        ):
            result = await self.session.execute(
                select(column).where(
                    Employee.deleted_at.is_(None), column.is_not(None),
                ).distinct().order_by(column.asc())
            )
            options[key] = list(result.scalars().all())
        return options
