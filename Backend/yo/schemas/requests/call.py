from datetime import datetime
from uuid import UUID
from typing import Self
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from yo.core.mail_schedule import aware, validate_reminder


class CallCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("reminder")
    @classmethod
    def validate_mail_lead_time(cls, value):
        return validate_reminder(value)

    @field_validator("call_start_time")
    @classmethod
    def normalize_mail_time(cls, value):
        return aware(value)

    workspace_id: UUID
    contact_id: UUID
    subject: str = Field(min_length=1, max_length=255)
    call_type: str = Field(pattern="^(Outbound|Inbound|Missed)$")
    call_status: str = "Completed"
    call_start_time: datetime
    duration_minutes: int | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    related_to: str | None = None
    voice_recording: str | None = None
    call_purpose: str | None = None
    call_agenda: str | None = None
    reminder: str | None = None
    assigned_to: UUID | None = None

    @field_validator("subject", "call_status", "related_to", "voice_recording", "call_purpose", "call_agenda", "reminder")
    @classmethod
    def strip_whitespace(cls, value: str | None) -> str | None:
        if value is not None:
            return value.strip()
        return value

    @model_validator(mode="after")
    def balance_duration_metrics(self) -> Self:
        minutes = self.duration_minutes or 0
        seconds = self.duration_seconds or 0

        if seconds >= 60:
            extra_minutes = seconds // 60
            remaining_seconds = seconds % 60
            self.duration_minutes = minutes + extra_minutes
            self.duration_seconds = remaining_seconds

        return self


class CallUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("reminder")
    @classmethod
    def validate_mail_lead_time(cls, value):
        return validate_reminder(value)

    @field_validator("call_start_time")
    @classmethod
    def normalize_mail_time(cls, value):
        return aware(value)

    
    contact_id: UUID | None = None
    subject: str | None = Field(default=None, min_length=1, max_length=255)
    call_type: str | None = Field(default=None, pattern="^(Outbound|Inbound|Missed)$")
    call_status: str | None = None
    call_start_time: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    related_to: str | None = None
    voice_recording: str | None = None
    call_purpose: str | None = None
    call_agenda: str | None = None
    reminder: str | None = None
    assigned_to: UUID | None = None

    @field_validator("subject", "call_status", "related_to", "voice_recording", "call_purpose", "call_agenda", "reminder")
    @classmethod
    def strip_optional_whitespace(cls, value: str | None) -> str | None:
        if value is not None:
            return value.strip()
        return value

    @model_validator(mode="after")
    def balance_partial_duration_metrics(self) -> Self:
        if self.duration_seconds is not None and self.duration_seconds >= 60:
            minutes = self.duration_minutes or 0
            extra_minutes = self.duration_seconds // 60
            self.duration_minutes = minutes + extra_minutes
            self.duration_seconds = self.duration_seconds % 60
        return self
