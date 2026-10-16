from uuid import UUID,uuid4
from pathlib import Path
from fastapi import  UploadFile

from yo.core.exceptions import (
    AppException,
    ConflictException,
    NotFoundException,
)
from yo.models.contact import Contact
from yo.repositories.contact import ContactRepository
from yo.repositories.workspace import WorkspaceRepository
from yo.schemas.requests.contact import ContactCreateRequest,ContactUpdateRequest

STORAGE_DIR = Path(__file__).resolve().parents[2] / "storage"
ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_FILE_SIZE = 5 * 1024 * 1024

class ContactService:

    def __init__(self,repository: ContactRepository,):
        self.repository = repository

    async def _ensure_workspace_access(self, workspace_id: UUID | None, user_id: UUID) -> None:
        access = WorkspaceRepository(self.repository.session)
        if workspace_id is None:
            # Legacy unassigned contacts are administrative records only.
            allowed = await access.session.scalar(access.privileged_user(user_id).select())
        else:
            allowed = await access.user_has_workspace(user_id, workspace_id)
        if not allowed:
            raise AppException("You do not have access to the selected workspace.", 403)

    async def get_by_id(self,contact_id: UUID, user_id: UUID) -> Contact:
        contact = await self.repository.get_detail(contact_id, user_id)
        if not contact:
            raise NotFoundException(
                "Contact",
                str(contact_id),
            )
        return contact

    async def create(self,request: ContactCreateRequest,user_id: UUID,) -> Contact:
        await self._ensure_workspace_access(request.workspace_id, user_id)
        values = request.model_dump()
        values["owner_id"] = user_id
        values["email_opt_out"] = bool(values.get("email_opt_out", False))
        contact = await self.repository.create(
            Contact(
                **values,
                stage="contact",
                created_by=user_id,
            )
        )
        return await self.get_by_id(contact.id, user_id)

    async def save_contact_image(
        self,
        user_id: UUID,
        contact_id: UUID,
        file: UploadFile,
    ) -> str:
        await self.get_by_id(contact_id, user_id)
        extension = ALLOWED_TYPES.get(file.content_type or "")

        if not extension:
            raise AppException(
                "Only JPG, PNG, and WEBP images are allowed.",
                400,
            )

        content = await file.read(MAX_FILE_SIZE + 1)

        if not content:
            raise AppException("Image is empty.", 400)

        if len(content) > MAX_FILE_SIZE:
            raise AppException(
                "Image size must not exceed 5 MB.",
                413,
            )

        user_storage_dir = STORAGE_DIR / str(user_id)
        user_storage_dir.mkdir(parents=True, exist_ok=True)

        filename = f"contact_{contact_id}_{uuid4().hex}{extension}"
        destination = user_storage_dir / filename

        destination.write_bytes(content)

        return f"storage/{user_id}/{filename}"



    async def list_by_stage(self,stage: str, user_id: UUID, search: str | None = None, page: int = 1, per_page: int = 5, workspace_id: UUID | None = None):
        if workspace_id is not None:
            await self._ensure_workspace_access(workspace_id, user_id)
        return await self.repository.list_by_stage(
            user_id=user_id, workspace_id=workspace_id,
            stage=stage,
            search=search,
            page=page,
            per_page=per_page,
        )

    async def update(self,contact_id: UUID,request: ContactUpdateRequest,user_id: UUID) -> Contact:
        await self.get_by_id(contact_id, user_id)
        values = request.model_dump(exclude_unset=True)
        values.pop("owner_id", None)
        if "workspace_id" in values:
            await self._ensure_workspace_access(values["workspace_id"], user_id)
        if (
            "email_opt_out" in values
            and values["email_opt_out"] is None
        ):
            values["email_opt_out"] = False

        values["updated_by"] = user_id
        await self.repository.update_by_id(contact_id,values)
        return await self.get_by_id(contact_id, user_id)

    async def move_to(self,contact_id: UUID,stage: str,user_id: UUID) -> Contact:
        if stage not in {"lead", "customer"}:
            raise AppException("Invalid contact stage.", 400)
        contact = await self.get_by_id(contact_id, user_id)
        if contact.stage == stage:
            raise ConflictException(
                f"Record is already a {stage}."
            )
        await self.repository.update_by_id(
            contact_id,
            {
                "stage": stage,
                "updated_by": user_id,
            },
        )
        return await self.get_by_id(contact_id, user_id)

    async def delete(self,contact_id: UUID,user_id: UUID,) -> None:
        await self.get_by_id(contact_id, user_id)
        await self.repository.soft_delete(contact_id,user_id)

    async def bulk_delete(self,ids: list[UUID],user_id: UUID) -> int:
        # Validate the complete batch before writing any row.
        for contact_id in set(ids):
            await self.get_by_id(contact_id, user_id)
        return await self.repository.soft_delete_many(ids,user_id)

