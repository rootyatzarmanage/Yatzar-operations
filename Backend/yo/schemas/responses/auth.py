from uuid import UUID

from pydantic import BaseModel, Field

from yo.schemas.responses.role import PermissionResponse


class AuthWorkspaceResponse(BaseModel):
    id: UUID
    name: str


class AuthUserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    employee_name: str | None
    display_name: str | None
    role: str
    photo: str | None
    token: str | None = None

    workspaces: list[AuthWorkspaceResponse] = Field(default_factory=list)

    permissions: list[PermissionResponse] = Field(default_factory=list)
