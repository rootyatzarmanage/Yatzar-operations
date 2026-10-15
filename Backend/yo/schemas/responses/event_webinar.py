from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EventWebinarResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    webinar_schedule: datetime
    duration: str
    campaign_owner_id: UUID | None = None
    type: str
    campaign_name: str
    status: str | None = None
    expected_revenue: Decimal | None = None
    budgeted_cost: Decimal | None = None
    actual_cost: Decimal | None = None
    description: str | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None


class EventWebinarListResponse(BaseModel):
    items: list[EventWebinarResponse]
    total: int
    page: int
    per_page: int


class EventWebinarOptionsResponse(BaseModel):
    owners: list[dict]