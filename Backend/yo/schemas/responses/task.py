from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ContactSelectionResponse(BaseModel):
    selection_type: Literal["name", "tag"] = "name"
    tag_id: UUID | None = None
    contact_ids: list[UUID] = Field(default_factory=list)


class TaskResponse(BaseModel):
    workspace_id: UUID

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subject: str
    due_date: date | None = None
    task_owner_id: UUID
    contact_selection: ContactSelectionResponse
    account: str | None = None
    status: str
    priority: str
    reminder_enabled: bool
    reminder_at: datetime | None = None
    reminder_type: str | None = None
    repeat_enabled: bool
    description: str | None = None
    created_at: datetime
    updated_at: datetime
