from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CampaignResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_subject: str
    sender_name: str | None = None
    sender_address: str
    reply_to_address: str
    campaign_owner_id: UUID | None = None
    campaign_name: str
    type: str
    status: str | None = None
    budgeted_cost: Decimal | None = None
    actual_cost: Decimal | None = None
    description: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None


class CampaignListResponse(BaseModel):
    items: list[CampaignResponse]
    total: int
    page: int
    per_page: int


class CampaignOptionsResponse(BaseModel):
    owners: list[dict]
    sender_addresses: list[str]
    reply_to_addresses: list[str]
