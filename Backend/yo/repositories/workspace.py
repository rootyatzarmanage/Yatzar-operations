from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from yo.models.workspace import Workspace


class WorkspaceRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, workspace: Workspace) -> Workspace:
        self.session.add(workspace)
        await self.session.flush()
        await self.session.refresh(workspace)
        return workspace

    async def get_by_id(self, workspace_id: UUID) -> Workspace | None:
        return await self.session.scalar(
            select(Workspace).where(
                Workspace.id == workspace_id,
                Workspace.deleted_at.is_(None),
            )
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
