from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PermissionResponse(BaseModel):
    menu: str
    create: bool
    view: bool
    update: bool
    delete: bool


class RoleResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    is_system: bool
    permissions: list[PermissionResponse]
    created_at: datetime
    created_by: UUID | None
    updated_at: datetime
    updated_by: UUID | None