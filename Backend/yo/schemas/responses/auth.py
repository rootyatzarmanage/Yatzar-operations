from uuid import UUID

from pydantic import BaseModel


class AuthUserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    employee_name: str | None
    display_name: str | None
    role: str
    photo: str | None
    token: str | None = None
