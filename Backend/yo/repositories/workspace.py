from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.workspace import Workspace
from yo.models.employee import Employee, employee_workspaces
from yo.models.user import User
from yo.models.permission import Role
from yo.core.auth.permissions import WORKSPACE_ADMIN_ROLES


class WorkspaceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    @staticmethod
    def privileged_user(user_id: UUID):
        return select(User.id).join(Role, Role.id == User.role_id).where(
            User.id == user_id, User.is_active.is_(True), User.deleted_at.is_(None),
            Role.deleted_at.is_(None), Role.is_system.is_(True),
            Role.name.in_(WORKSPACE_ADMIN_ROLES),
        ).exists()

    @classmethod
    def accessible_ids(cls, user_id: UUID):
        membership = select(employee_workspaces.c.workspace_id).join(
            Employee, Employee.id == employee_workspaces.c.employee_id,
        ).join(User, User.id == Employee.user_id).where(
            Employee.user_id == user_id, Employee.deleted_at.is_(None),
            Employee.status == 1, User.deleted_at.is_(None), User.is_active.is_(True),
        )
        return select(Workspace.id).where(
            Workspace.deleted_at.is_(None), Workspace.status == "Enabled",
            or_(cls.privileged_user(user_id), Workspace.id.in_(membership)),
        )

    @classmethod
    def scope_condition(cls, column, user_id: UUID, workspace_id: UUID | None = None):
        condition = column.in_(cls.accessible_ids(user_id))
        if workspace_id is not None:
            condition = and_(condition, column == workspace_id)
        return condition

    async def user_has_workspace(self, user_id: UUID, workspace_id: UUID) -> bool:
        return await self.session.scalar(select(
            self.accessible_ids(user_id).where(Workspace.id == workspace_id).exists()
        ))

    async def list_for_user(self, user_id: UUID, skip: int = 0, limit: int = 50):
        result = await self.session.execute(
            select(Workspace).where(Workspace.id.in_(self.accessible_ids(user_id)))
            .order_by(Workspace.created_at.desc(), Workspace.id).offset(skip).limit(limit)
        )
        return list(result.scalars().unique().all())

    async def create(self, workspace: Workspace) -> Workspace:
        self.session.add(workspace)
        await self.session.flush()
        await self.session.refresh(workspace)
        return workspace

    async def get_by_id(self, workspace_id: UUID, *, for_update: bool = False) -> Workspace | None:
        query = select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.deleted_at.is_(None),
        )
        if for_update:
            query = query.with_for_update().execution_options(populate_existing=True)
        return await self.session.scalar(query)

    async def get_id_by_image(self, image: str, user_id: UUID) -> UUID | None:
        return await self.session.scalar(
            select(Workspace.id).where(
                Workspace.image == image,
                Workspace.deleted_at.is_(None),
                or_(
                    Workspace.id.in_(self.accessible_ids(user_id)),
                    self.privileged_user(user_id),
                ),
            ).limit(1)
        )

    async def get_active_by_name(self, name: str) -> Workspace | None:
        return await self.session.scalar(
            select(Workspace).where(
                func.lower(Workspace.name) == name.casefold(),
                Workspace.deleted_at.is_(None),
            )
        )

    async def list_all(self, skip: int, limit: int) -> Sequence[Workspace]:
        result = await self.session.execute(
            select(Workspace)
            .where(Workspace.deleted_at.is_(None))
            .order_by(Workspace.created_at.desc(), Workspace.id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update(self, workspace: Workspace) -> Workspace:
        await self.session.flush()
        await self.session.refresh(workspace)
        return workspace

    async def soft_delete(self, workspace: Workspace) -> None:
        workspace.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()


    async def is_privileged(self, user_id: UUID) -> bool:
        return bool(await self.session.scalar(self.privileged_user(user_id).select()))

    @staticmethod
    def owner_ids(workspace_id: UUID):
        members = select(Employee.user_id).join(
            employee_workspaces, Employee.id == employee_workspaces.c.employee_id,
        ).where(
            employee_workspaces.c.workspace_id == workspace_id,
            Employee.deleted_at.is_(None), Employee.status == 1,
        )
        return select(User.id).where(
            User.deleted_at.is_(None), User.is_active.is_(True),
            or_(
                User.id.in_(members),
                User.role.has(
                    (Role.deleted_at.is_(None)) & Role.is_system.is_(True)
                    & Role.name.in_(WORKSPACE_ADMIN_ROLES)
                ),
            ),
        )
