from datetime import datetime
from typing import Literal, Self
from uuid import UUID

from pydantic import (BaseModel,ConfigDict,Field,field_validator)


class MeetingParticipantResponse(BaseModel):
    id: UUID
    type: Literal["contact", "lead", "customer"]


class MeetingResponse(BaseModel):
    workspace_id: UUID

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str = Field(..., min_length=1, max_length=200)
    venue: str | None = None
    location: str | None = None
    meeting_provider: str | None = None
    meeting_link: str | None = None
    all_day: bool
    starts_at: datetime
    ends_at: datetime

    participants: list[MeetingParticipantResponse] = Field(default_factory=list)

    related_to: str | None = None
    repeat_frequency: str
    reminder: str
    participants_reminder: str
    reminder_type: str
    description: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None

    @field_validator(
        "title",
        "repeat_frequency",
        "reminder",
        "reminder_type",
    )
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip() if value is not None else value


class MeetingListResponse(BaseModel):
    items: list[MeetingResponse]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    per_page: int = Field(..., ge=1)

    @field_validator("total")
    @classmethod
    def validate_total_matches_items(cls, total: int) -> int:
        if total < 0:
            raise ValueError(
                "Total items metric count cannot be less than zero."
            )
        return total
