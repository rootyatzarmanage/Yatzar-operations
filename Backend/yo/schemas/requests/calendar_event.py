from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from yo.core.mail_schedule import aware, validate_reminder

EventType = Literal["Event", "Workshop", "Holiday"]
Repeat = Literal["None", "Daily", "Weekly", "Monthly", "Yearly"]


class CalendarGuestRequest(BaseModel):
    email: EmailStr
    name: str | None = Field(default=None, max_length=255)


class CalendarEventCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    title: str = Field(min_length=1, max_length=255)
    event_type: EventType = "Event"
    location: str | None = Field(default=None, max_length=500)
    description: str | None = None
    all_day: bool = False
    starts_at: datetime
    ends_at: datetime
    repeat_frequency: Repeat = "None"
    reminder: str = "10 minutes before"
    guests_reminder: str = "10 minutes before"
    guests: list[CalendarGuestRequest] = Field(default_factory=list, max_length=200)
    send_invites: bool = True

    @field_validator("reminder", "guests_reminder")
    @classmethod
    def check_reminder(cls, value):
        return validate_reminder(value)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def normalize_time(cls, value):
        return aware(value)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value):
        if not value.strip():
            raise ValueError("Title is required.")
        return value.strip()


class CalendarEventUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    event_type: EventType | None = None
    location: str | None = Field(default=None, max_length=500)
    description: str | None = None
    all_day: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    repeat_frequency: Repeat | None = None
    reminder: str | None = None
    guests_reminder: str | None = None
    guests: list[CalendarGuestRequest] | None = None
    send_invites: bool = True

    @field_validator("reminder", "guests_reminder")
    @classmethod
    def check_reminder(cls, value):
        return validate_reminder(value)

    @field_validator("starts_at", "ends_at")
    @classmethod
    def normalize_time(cls, value):
        return aware(value)


class CalendarRespondRequest(BaseModel):
    response: Literal["accepted", "declined", "maybe"]