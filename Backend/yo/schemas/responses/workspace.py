from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    description: str
    image: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceImageResponse(BaseModel):
    workspace_id: UUID
    image: str | None = None
