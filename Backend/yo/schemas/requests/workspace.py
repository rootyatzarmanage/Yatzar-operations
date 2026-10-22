from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


WorkspaceStatus = Literal["Enabled", "Disabled"]
MailMailer = Literal["smtp"]
MailEncryption = Literal["TLS", "SSL", "none"]


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: str = Field(..., min_length=1, max_length=2000)
    status: WorkspaceStatus = "Enabled"
    platform_name: str = Field(..., min_length=1, max_length=150)
    mail_mailer: MailMailer = "smtp"
    mail_host: str = Field(..., min_length=1, max_length=255)
    mail_port: int = Field(..., ge=1, le=65535)
    mail_username: str = Field(..., min_length=1, max_length=320)
    mail_password: str = Field(..., min_length=1, max_length=500)
    mail_encryption: MailEncryption = "TLS"
    mail_from_address: EmailStr
    mail_from_name: str = Field(..., min_length=1, max_length=150)
    mail_status: WorkspaceStatus = "Enabled"

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "description", "platform_name", "mail_host", "mail_username", "mail_from_name")
    @classmethod
    def validate_non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = Field(None, min_length=1, max_length=2000)
    status: WorkspaceStatus | None = None
    platform_name: str | None = Field(None, min_length=1, max_length=150)
    mail_mailer: MailMailer | None = None
    mail_host: str | None = Field(None, min_length=1, max_length=255)
    mail_port: int | None = Field(None, ge=1, le=65535)
    mail_username: str | None = Field(None, min_length=1, max_length=320)
    mail_password: str | None = Field(None, max_length=500)
    mail_encryption: MailEncryption | None = None
    mail_from_address: EmailStr | None = None
    mail_from_name: str | None = Field(None, min_length=1, max_length=150)
    mail_status: WorkspaceStatus | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "description", "platform_name", "mail_host", "mail_username", "mail_from_name")
    @classmethod
    def validate_non_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @model_validator(mode="after")
    def reject_null_updates(self):
        for field_name in self.model_fields_set:
            if field_name != "mail_password" and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self
