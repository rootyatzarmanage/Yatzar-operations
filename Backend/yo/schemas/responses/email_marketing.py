from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EmailMarketingResponse(BaseModel):
    workspace_id: UUID

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_name: str
    platform: str
    from_email: str
    mail_type: str
    to_email: str | None = None
    tag_id: UUID | None = None
    subject: str
    content: str
    status: str
    sent_count: int
    open_count: int
    click_count: int
    sent_at: datetime | None = None
    scheduled_at: datetime | None = None
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None


class EmailMarketingListItemResponse(BaseModel):
    workspace_id: UUID

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    campaign_name: str
    subject: str
    status: str
    sent_count: int
    scheduled_at: datetime | None = None
    open_count: int
    click_count: int
    updated_at: datetime | None = None


class EmailMarketingListResponse(BaseModel):
    items: list[EmailMarketingListItemResponse]
    total: int
    page: int
    per_page: int


class EmailMarketingRecipientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None = None
    email: str
    is_enabled: bool
    sent: bool
    open_count: int
    click_count: int
    first_opened_at: datetime | None = None
    last_opened_at: datetime | None = None
    first_clicked_at: datetime | None = None
    last_clicked_at: datetime | None = None


class EmailMarketingRecipientListResponse(BaseModel):
    items: list[EmailMarketingRecipientResponse]

    total: int
    page: int
    per_page: int


class EmailMarketingReportResponse(BaseModel):
    campaign_id: UUID
    campaign_name: str
    sent: int
    opens: int
    clicks: int
    last_edited: datetime | None = None
