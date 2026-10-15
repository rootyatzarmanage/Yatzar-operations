from datetime import datetime
from uuid import UUID
from typing import Self
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class CallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    contact_id: UUID
    subject: str
    call_type: str
    call_status: str
    call_start_time: datetime
    duration_minutes: int | None = None
    duration_seconds: int | None = None
    related_to: str | None = None
    voice_recording: str | None = None
    call_purpose: str | None = None
    call_agenda: str | None = None
    reminder: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("subject", "call_type", "call_status", "related_to", "voice_recording", "call_purpose", "call_agenda", "reminder")
    @classmethod
    def strip_whitespace(cls, value: str | None) -> str | None:
        """Removes formatting space paddings from text fields."""
        if value is not None:
            return value.strip()
        return value

    @model_validator(mode="after")
    def validate_audit_timeline(self) -> Self:
        """Validates that audit markers follow chronologically realistic orders."""
        if self.updated_at < self.created_at:
            raise ValueError("The 'updated_at' timestamp cannot be earlier than 'created_at'.")
        return self


class CallListResponse(BaseModel):
    items: list[CallResponse]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    per_page: int = Field(ge=1)

    @field_validator("total")
    @classmethod
    def verify_total_records(cls, value: int, info) -> int:
        if value < 0:
            raise ValueError("Total metrics field cannot hold negative structural data.")
        return value
