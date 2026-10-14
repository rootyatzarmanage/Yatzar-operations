from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskCreateRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    due_date: date | None = None
    tag_id: UUID | None = None
    contact_ids: list[UUID] = Field(default_factory=list)
    account: str | None = None
    status: str = "Not Started"
    priority: str = "High"
    reminder_enabled: bool = False
    reminder_at: datetime | None = None
    reminder_type: str | None = None
    repeat_enabled: bool = False
    description: str | None = None


class TaskUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject: str | None = Field(default=None, min_length=1, max_length=255)
    due_date: date | None = None
    tag_id: UUID | None = None
    contact_ids: list[UUID] | None = None
    account: str | None = None
    status: str | None = None
    priority: str | None = None
    reminder_enabled: bool | None = None
    reminder_at: datetime | None = None
    reminder_type: str | None = None
    repeat_enabled: bool | None = None
    description: str | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subject: str
    due_date: date | None
    task_owner_id: UUID
    tag_id: UUID | None
    contact_ids: list[UUID] = []
    account: str | None
    status: str
    priority: str
    reminder_enabled: bool
    reminder_at: datetime | None
    reminder_type: str | None
    repeat_enabled: bool
    description: str | None
    created_at: datetime
    updated_at: datetime