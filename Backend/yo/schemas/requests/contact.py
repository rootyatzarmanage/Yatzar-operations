from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_serializer


class PurchasedProductRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=1, ge=1, le=100000)
    purchased_on: date | None = None

    @field_serializer("purchased_on")
    def serialize_date(self, value):
        return value.isoformat() if value else None


class ContactCreateRequest(BaseModel):
    workspace_id: UUID | None = None
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    company: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    secondary_email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    other_phone: str | None = Field(default=None, max_length=30)
    home_phone: str | None = Field(default=None, max_length=30)
    mobile: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    lead_source: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=150)
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
    purchased_products: list[PurchasedProductRequest] = Field(default_factory=list)


class ContactUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    workspace_id: UUID | None = None
    owner_id: UUID | None = None
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    company: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = None
    secondary_email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    other_phone: str | None = Field(default=None, max_length=30)
    home_phone: str | None = Field(default=None, max_length=30)
    mobile: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    lead_source: str | None = Field(default=None, max_length=100)
    department: str | None = Field(default=None, max_length=150)
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
    email_opt_out: bool | None = None
    purchased_products: list[PurchasedProductRequest] | None = None


class ContactBulkDeleteRequest(BaseModel):
    ids: list[UUID] = Field(min_length=1)
