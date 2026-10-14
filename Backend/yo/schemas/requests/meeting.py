from datetime import datetime
from uuid import UUID
from typing import Self , Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

    
class MeetingParticipantRequest(BaseModel):
    id: UUID
    type: Literal["contact", "lead", "customer"]

class MeetingCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    venue: str | None = None
    location: str | None = None
    all_day: bool = False
    starts_at: datetime
    ends_at: datetime
    participants: list[MeetingParticipantRequest] = Field(default_factory=list)
    related_to: str | None = None
    repeat_frequency: str = "None"
    reminder: str = "None"
    participants_reminder: str = "None"
    reminder_type: str = "None"
    description: str | None = None

    @field_validator("title", "repeat_frequency", "reminder", "participants_reminder", "reminder_type")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        if value is not None:
            return value.strip()
        return value



class MeetingUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    venue: str | None = None
    location: str | None = None
    all_day: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    participants: list[MeetingParticipantRequest] | None = None
    related_to: str | None = None
    repeat_frequency: str | None = None
    reminder: str | None = None
    participants_reminder: str | None = None
    reminder_type: str | None = None
    description: str | None = None

    @field_validator("title", "repeat_frequency", "reminder", "participants_reminder", "reminder_type")
    @classmethod
    def strip_optional_whitespace(cls, value: str | None) -> str | None:
        """Strips out structural whitespaces if the field is provided in the partial update."""
        if value is not None:
            return value.strip()
        return value
