from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CampaignCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    campaign_subject: str = Field(min_length=1, max_length=255)
    sender_name: str | None = Field(default=None, max_length=150)
    sender_address: EmailStr
    reply_to_address: EmailStr
    campaign_owner_id: UUID | None = None
    campaign_name: str = Field(min_length=1, max_length=255)
    type: str
    status: str | None = None
    budgeted_cost: Decimal | None = Field(default=None, ge=0)
    actual_cost: Decimal | None = Field(default=None, ge=0)
    description: str | None = None


class CampaignUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    campaign_subject: str | None = Field(default=None, min_length=1, max_length=255)
    sender_name: str | None = Field(default=None, max_length=150)
    sender_address: EmailStr | None = None
    reply_to_address: EmailStr | None = None
    campaign_owner_id: UUID | None = None
    campaign_name: str | None = Field(default=None, min_length=1, max_length=255)
    type: str | None = None
    status: str | None = None
    budgeted_cost: Decimal | None = Field(default=None, ge=0)
    actual_cost: Decimal | None = Field(default=None, ge=0)
    description: str | None = None


class CampaignBulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1)
