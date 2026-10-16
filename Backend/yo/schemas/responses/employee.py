from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None = None
    employee_code: str
    status: Literal[0, 1]

    employee_name: str | None = None
    display_name: str | None = None
    employee_type: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    photo: str | None = None
    blood_group: str | None = None
    marital_status: str | None = None

    mobile_number: str | None = None
    alternate_phone: str | None = None
    email: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_number: str | None = None

    address_line1: str | None = None
    address_line2: str | None = None
    country: str | None = None
    state: str | None = None
    district: str | None = None
    pincode: str | None = None

    permanent_address_line1: str | None = None
    permanent_address_line2: str | None = None
    permanent_country: str | None = None
    permanent_state: str | None = None
    permanent_district: str | None = None
    permanent_pincode: str | None = None

    date_of_joining: date | None = None
    department: str | None = None
    designation: str | None = None
    reporting_manager: str | None = None
    work_location: str | None = None
    employment_status: str | None = None

    aadhar_number: str | None = None
    pan_number: str | None = None
    uan_number: str | None = None

    bank_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None

    resume_file: str | None = None
    id_proof_file: str | None = None
    offer_letter_file: str | None = None

    experience: str | None = None
    skills: str | None = None
    qualifications: str | None = None
    remarks: str | None = None

    username: str | None = None
    login_email: str | None = None
    role: str | None = None
    is_active: bool | None = None

    created_by: UUID | None = None
    updated_by: UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def include_user_fields(cls, value):
        if isinstance(value, dict):
            return value
        data = {field: getattr(value, field) for field in cls.model_fields if hasattr(value, field)}
        if data.get("status") in ("active", "saved"):
            data["status"] = 1
        elif data.get("status") in ("draft", "incomplete"):
            data["status"] = 0
        user = getattr(value, "user", None)
        if user is not None:
            data.update(
                username=user.username,
                login_email=user.email,
                role=user.role.name if user.role else None,
                is_active=user.is_active,
            )
        return data


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    per_page: int


class EmployeeCodeResponse(BaseModel):
    employee_codes: list[str]
