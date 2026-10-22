import logging
from typing import Sequence
from uuid import UUID, uuid4

from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool

from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.exceptions import AppException, ConflictException, NotFoundException
from yo.core.storage import STORAGE_DIR, read_image
from yo.models.workspace import Workspace
from yo.repositories.workspace import WorkspaceRepository
from yo.schemas.requests.workspace import (
    WorkspaceCreateRequest,
    WorkspaceUpdateRequest,
)
from yo.core.secret_box import encrypt_secret


logger = logging.getLogger(__name__)


class WorkspaceService:
    def __init__(self, session: AsyncSession):
        self.repository = WorkspaceRepository(session)

    async def create(self, request: WorkspaceCreateRequest) -> Workspace:
        if await self.repository.get_active_by_name(request.name):
            raise ConflictException("An active workspace with this name already exists.")
        values = request.model_dump()
        values["mail_password"] = encrypt_secret(values["mail_password"])
        return await self.repository.create(Workspace(**values))

    async def get_by_id(self, workspace_id: UUID) -> Workspace:
        workspace = await self.repository.get_by_id(workspace_id)
        if not workspace:
            raise NotFoundException("Workspace", str(workspace_id))
        return workspace

    async def list_all(self, skip: int = 0, limit: int = 50) -> Sequence[Workspace]:
        return await self.repository.list_all(skip, limit)

    async def list_for_user(self, user_id: UUID, skip: int = 0, limit: int = 50):
        return await self.repository.list_for_user(user_id, skip, limit, include_disabled=True)

    async def ensure_access(self, user_id: UUID, workspace_id: UUID | None, *, include_disabled: bool = False) -> None:
        if workspace_id is None:
            raise AppException("Workspace is required.", 400)
        if not await self.repository.user_has_workspace(user_id, workspace_id, include_disabled=include_disabled):
            raise AppException("You do not have access to the selected workspace.", 403)

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
        if "mail_password" in values:
            password = values.pop("mail_password")
            if password:  
                workspace.mail_password = encrypt_secret(password)
        for field_name, value in values.items():
            setattr(workspace, field_name, value)
        return await self.repository.update(workspace)

    async def delete(self, workspace_id: UUID) -> None:
        workspace = await self.get_by_id(workspace_id)
        await self.repository.soft_delete(workspace)

    async def _image_workspace(
        self, workspace_id: UUID, user_id: UUID, *, for_update: bool = False
    ) -> Workspace:
        workspace = await self.repository.get_by_id(workspace_id, for_update=for_update)
        if not workspace:
            raise NotFoundException("Workspace", str(workspace_id))
        await self.ensure_access(user_id, workspace_id)
        return workspace

    @staticmethod
    def _remove_image(workspace_id: UUID, image: str | None) -> None:
        if image is None:
            return
        # Only files inside this workspace's managed directory may be removed.
        directory = (STORAGE_DIR / "workspaces" / str(workspace_id)).resolve()
        destination = (STORAGE_DIR.parent / image).resolve()
        if destination.parent == directory and destination.is_relative_to(STORAGE_DIR.resolve()):
            destination.unlink(missing_ok=True)

    async def get_workspace_image(self, workspace_id: UUID, user_id: UUID) -> Workspace:
        return await self._image_workspace(workspace_id, user_id)

    async def save_workspace_image(
        self, workspace_id: UUID, file: UploadFile, user_id: UUID
    ) -> Workspace:
        workspace = await self._image_workspace(workspace_id, user_id, for_update=True)
        content, extension = await read_image(file)
        old_image = workspace.image
        directory = STORAGE_DIR / "workspaces" / str(workspace_id)
        filename = f"workspace_image_{uuid4().hex}{extension}"
        destination = directory / filename
        image_path = f"storage/workspaces/{workspace_id}/{filename}"
        try:
            await run_in_threadpool(directory.mkdir, parents=True, exist_ok=True)
            await run_in_threadpool(destination.write_bytes, content)
            workspace.image = image_path
            workspace = await self.repository.update(workspace)
        except Exception:
            await run_in_threadpool(self._remove_image, workspace_id, image_path)
            raise
        try:
            await run_in_threadpool(self._remove_image, workspace_id, old_image)
        except OSError:
            logger.exception("Failed to remove replaced workspace image", extra={"workspace_id": str(workspace_id)})
        logger.info("Workspace image saved", extra={"workspace_id": str(workspace_id)})
        return workspace

    async def update_workspace_image(
        self, workspace_id: UUID, file: UploadFile, user_id: UUID
    ) -> Workspace:
        return await self.save_workspace_image(workspace_id, file, user_id)

    async def delete_workspace_image(self, workspace_id: UUID, user_id: UUID) -> None:
        workspace = await self._image_workspace(workspace_id, user_id, for_update=True)
        old_image = workspace.image
        workspace.image = None
        await self.repository.update(workspace)
        await run_in_threadpool(self._remove_image, workspace_id, old_image)
        logger.info("Workspace image deleted", extra={"workspace_id": str(workspace_id)})
