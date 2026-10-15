from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, model_validator


class EmailMarketingCreateRequest(BaseModel):
    campaign_name: str = Field(min_length=1, max_length=255)
    platform: str = "Email"
    from_email: EmailStr
    mail_type: str = Field(min_length=1,max_length=100)
    to_email: EmailStr | None = None
    tag_id: UUID | None = None
    subject: str = Field(min_length=1,max_length=500)
    content: str = Field(min_length=1)
    @model_validator(mode="after")
    def validate_recipient(self):
        mail_type = self.mail_type.strip().lower()
        if mail_type == "test email":
            if not self.to_email:
                raise ValueError("to_email is required for test email")

        if mail_type == "send bulk email":
            if not self.tag_id:
                raise ValueError("tag_id is required for bulk email")
        return self

class EmailMarketingReplicateRequest(BaseModel):
    campaign_name: str | None = Field(default=None,max_length=255)

class EmailMarketingRecipientStatusRequest(BaseModel):
    is_enabled: bool


class EmailMarketingBulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1)