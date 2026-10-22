from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CalendarGuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str | None = None
    response: str
    is_organizer: bool


class CalendarEventResponse(BaseModel):
    id: UUID
    workspace_id: UUID | None = None
    title: str
    event_type: str
    location: str | None = None
    description: str | None = None
    all_day: bool
    starts_at: datetime
    ends_at: datetime
    repeat_frequency: str
    reminder: str
    guests_reminder: str
    guests: list[CalendarGuestResponse] = []
    created_by: UUID | None = None
    is_organizer: bool
    my_response: str | None = None
    my_reminder_minutes: int | None = None