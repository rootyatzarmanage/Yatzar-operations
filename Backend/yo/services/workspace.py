from typing import Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.exceptions import ConflictException, NotFoundException
from yo.models.workspace import Workspace
from yo.repositories.workspace import WorkspaceRepository
from yo.schemas.requests.workspace import (
    WorkspaceCreateRequest,
    WorkspaceUpdateRequest,
)


class WorkspaceService:
    def __init__(self, session: AsyncSession):
        self.repository = WorkspaceRepository(session)

    async def create(self, request: WorkspaceCreateRequest) -> Workspace:
        if await self.repository.get_active_by_name(request.name):
            raise ConflictException("An active workspace with this name already exists.")
        return await self.repository.create(Workspace(**request.model_dump()))

    async def get_by_id(self, workspace_id: UUID) -> Workspace:
        workspace = await self.repository.get_by_id(workspace_id)
        if not workspace:
            raise NotFoundException("Workspace", str(workspace_id))
        return workspace

    async def list_all(self, skip: int = 0, limit: int = 50) -> Sequence[Workspace]:
        return await self.repository.list_all(skip, limit)

    async def update(
        self, workspace_id: UUID, request: WorkspaceUpdateRequest
    ) -> Workspace:
        workspace = await self.get_by_id(workspace_id)
        values = request.model_dump(exclude_unset=True)
        name = values.get("name")
        if name is not None and name.casefold() != workspace.name.casefold():
            existing = await self.repository.get_active_by_name(name)
            if existing and existing.id != workspace.id:
                raise ConflictException(
                    "An active workspace with this name already exists."
                )
        for field_name, value in values.items():
            setattr(workspace, field_name, value)
        return await self.repository.update(workspace)

    async def delete(self, workspace_id: UUID) -> None:
        workspace = await self.get_by_id(workspace_id)
        await self.repository.soft_delete(workspace)
