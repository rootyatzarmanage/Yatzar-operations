from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Literal

class EmailMarketingCreateRequest(BaseModel):
    campaign_name: str = Field(min_length=1, max_length=255)
    platform: str = "Email"
    from_email: EmailStr
    mail_type: Literal["Test Email", "Bulk Email"]
    to_email: EmailStr | None = None
    tag_id: UUID | None = None
    selection_mode: Literal["all", "selected"] | None = None
    selected_user_ids: list[UUID] = Field(default_factory=list)
    subject: str = Field(min_length=1,max_length=500)
    content: str = Field(min_length=1)
    
    @model_validator(mode="after")
    def validate_recipients(self):
        if self.mail_type == "Test Email":
            if not self.to_email:
                raise ValueError("to_email is required for Test Email")

            if self.tag_id or self.selection_mode or self.selected_user_ids:
                raise ValueError("Tag selection is not allowed for Test Email")

        if self.mail_type == "Bulk Email":
            if not self.tag_id:
                raise ValueError("tag_id is required for Bulk Email")

            if self.selection_mode not in ("all", "selected"):
                raise ValueError("selection_mode must be all or selected")

            if self.selection_mode == "selected" and not self.selected_user_ids:
                raise ValueError("Select at least one recipient")

            if self.selection_mode == "all" and self.selected_user_ids:
                raise ValueError("selected_user_ids must be empty for Select All")

            if self.to_email:
                raise ValueError("to_email is not used for Bulk Email")
        return self

class EmailMarketingReplicateRequest(BaseModel):
    campaign_name: str | None = Field(default=None,max_length=255)

class EmailMarketingRecipientStatusRequest(BaseModel):
    is_enabled: bool


class EmailMarketingBulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1)