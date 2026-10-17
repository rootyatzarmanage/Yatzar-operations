from datetime import date, datetime
from uuid import UUID
from typing import Literal
from yo.core.mail_schedule import aware

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContactSelectionRequest(BaseModel):
    selection_type: Literal["name", "tag"] = "name"
    tag_id: UUID | None = None
    contact_ids: list[UUID] = Field(default_factory=list)

class TaskCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("reminder_at")
    @classmethod
    def normalize_mail_time(cls, value):
        return aware(value)

    workspace_id: UUID
    subject: str = Field(min_length=1, max_length=255)
    due_date: date | None = None
    contact_selection: ContactSelectionRequest = Field(default_factory=ContactSelectionRequest)
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

    @field_validator("reminder_at")
    @classmethod
    def normalize_mail_time(cls, value):
        return aware(value)

    subject: str | None = Field(default=None, min_length=1, max_length=255)
    due_date: date | None = None
    contact_selection: ContactSelectionRequest | None = None
    account: str | None = None
    status: str | None = None
    priority: str | None = None
    reminder_enabled: bool | None = None
    reminder_at: datetime | None = None
    reminder_type: str | None = None
    repeat_enabled: bool | None = None
    description: str | None = None
