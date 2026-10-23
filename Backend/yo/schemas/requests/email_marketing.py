from uuid import UUID
from datetime import datetime, timezone
from yo.core.mail_schedule import aware
from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, model_validator
from typing import Annotated, Literal


def future_schedule(value: datetime) -> datetime:
    value = aware(value)
    if value <= datetime.now(timezone.utc):
        raise ValueError("scheduled_at must be a future date and time.")
    return value


ScheduledDateTime = Annotated[datetime, AfterValidator(future_schedule)]

class EmailMarketingCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    campaign_name: str = Field(min_length=1, max_length=255)
    platform: str = "Email"
    from_email: EmailStr
    mail_type: Literal["Test Email", "Bulk Email"]
    to_email: EmailStr | None = None
    tag_id: UUID | None = None
    tag_ids: list[UUID] = Field(
        default_factory=list,
        description="Recipient tag UUIDs. Contacts from all selected tags are combined. Legacy tag_id is accepted for single-tag requests.",
    )
    selection_mode: Literal["all", "selected"] | None = None
    selected_user_ids: list[UUID] = Field(
        default_factory=list,
        description="Enabled contact UUIDs across the chosen tags when selection_mode is selected. Other eligible contacts are saved as disabled. With all, every eligible contact is enabled.",
    )
    subject: str = Field(min_length=1,max_length=500)
    content: str = Field(min_length=1)
    scheduled_at: ScheduledDateTime | None = Field(
        default=None,
        description="Future send date and time with timezone, e.g. 2030-01-01T10:00:00+05:30. Without an offset, MAIL_TIMEZONE applies. Null queues immediate delivery. Recipients and message content are saved when this request is created.",
    )
    
    @model_validator(mode="after")
    def validate_recipients(self):
        self.scheduled_at = aware(self.scheduled_at)
        if self.mail_type == "Test Email":
            if not self.to_email:
                raise ValueError("to_email is required for Test Email")

            if self.tag_id or self.tag_ids or self.selection_mode or self.selected_user_ids:
                raise ValueError("Tag selection is not allowed for Test Email")

        if self.mail_type == "Bulk Email":
            self.tag_ids = list(dict.fromkeys(self.tag_ids))
            self.selected_user_ids = list(dict.fromkeys(self.selected_user_ids))
            if self.tag_id and self.tag_ids and self.tag_id not in self.tag_ids:
                raise ValueError("tag_id must belong to tag_ids when both are supplied")
            if not self.tag_ids and self.tag_id:
                self.tag_ids = [self.tag_id]
            if not self.tag_ids:
                raise ValueError("tag_ids is required for Bulk Email (or legacy tag_id)")
            # Keep the scalar field compatible with existing API consumers.
            self.tag_id = self.tag_ids[0]

            if self.selection_mode not in ("all", "selected"):
                raise ValueError("selection_mode must be all or selected")

            if self.selection_mode == "selected" and not self.selected_user_ids:
                raise ValueError("Select at least one recipient")

            if self.selection_mode == "all" and self.selected_user_ids:
                raise ValueError("selected_user_ids must be empty for Select All")

            if self.to_email:
                raise ValueError("to_email is not used for Bulk Email")
        return self


class EmailMarketingScheduleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scheduled_at: ScheduledDateTime = Field(
        description="New future send date/time. Only campaigns whose sending has not started can be rescheduled.",
    )

class EmailMarketingReplicateRequest(BaseModel):
    campaign_name: str | None = Field(default=None,max_length=255)

class EmailMarketingRecipientStatusRequest(BaseModel):
    is_enabled: bool


class EmailMarketingBulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1)
