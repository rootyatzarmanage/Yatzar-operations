from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    description: str
    image: str | None = None
    status: str
    platform_name: str | None = None
    mail_mailer: str | None = None
    mail_host: str | None = None
    mail_port: int | None = None
    mail_username: str | None = None
    mail_encryption: str | None = None
    mail_from_address: str | None = None
    mail_from_name: str | None = None
    mail_status: str = "Enabled"
    has_mail_password: bool = False

    @model_validator(mode="before")
    @classmethod
    def add_password_flag(cls, data):
        if hasattr(data, "mail_password"):
            return {
                **{k: getattr(data, k, None) for k in cls.model_fields if k != "has_mail_password"},
                "has_mail_password": bool(data.mail_password),
            }
        return data

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceImageResponse(BaseModel):
    workspace_id: UUID
    image: str | None = None
