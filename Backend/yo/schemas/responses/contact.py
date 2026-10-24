from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PurchasedProductResponse(BaseModel):
    name: str
    quantity: int = 1
    purchased_on: date | None = None


class ContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID | None = None
    owner_id: UUID | None = None
    first_name: str | None = None
    last_name: str | None = None
    company: str | None = None
    photo: str | None = None
    email: str | None = None
    secondary_email: str | None = None
    phone: str | None = None
    other_phone: str | None = None
    home_phone: str | None = None
    mobile: str | None = None
    date_of_birth: date | None = None
    lead_source: str | None = None
    department: str | None = None
    tag_id: UUID | None = None
    mailing_country: str | None = None
    mailing_state: str | None = None
    mailing_city: str | None = None
    mailing_zip: str | None = None
    mailing_building: str | None = None
    mailing_street: str | None = None
    other_country: str | None = None
    other_state: str | None = None
    other_city: str | None = None
    other_zip: str | None = None
    other_building: str | None = None
    other_street: str | None = None
    description: str | None = None
    email_opt_out: bool = False
    purchased_products: list[PurchasedProductResponse] = []
    stage: str
    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
    page: int
    per_page: int



class OwnerOptionResponse(BaseModel):
    id: UUID
    username: str
