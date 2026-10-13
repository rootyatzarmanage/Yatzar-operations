from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: int
    created_at: datetime
    deleted_at: datetime | None = None
    created_by: UUID | None = None
    deleted_by: UUID | None = None