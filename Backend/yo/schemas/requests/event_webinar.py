from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class EventWebinarCreateRequest(BaseModel):
    webinar_schedule: datetime
    duration: str = Field(min_length=1, max_length=50)
    campaign_owner_id: UUID | None = None
    type: str = Field(min_length=1, max_length=100)
    campaign_name: str = Field(min_length=1, max_length=255)
    status: str | None = None
    expected_revenue: Decimal | None = Field(default=None, ge=0)
    budgeted_cost: Decimal | None = Field(default=None, ge=0)
    actual_cost: Decimal | None = Field(default=None, ge=0)
    description: str | None = None


class EventWebinarUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    webinar_schedule: datetime | None = None
    duration: str | None = Field(default=None, min_length=1, max_length=50)
    campaign_owner_id: UUID | None = None
    type: str | None = Field(default=None, min_length=1, max_length=100)
    campaign_name: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = None
    expected_revenue: Decimal | None = Field(default=None, ge=0)
    budgeted_cost: Decimal | None = Field(default=None, ge=0)
    actual_cost: Decimal | None = Field(default=None, ge=0)
    description: str | None = None


class EventWebinarBulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1)