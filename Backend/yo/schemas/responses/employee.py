from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class EmployeeResponse(BaseModel):
    id: UUID
    user_id: UUID
    employee_code: str
    employee_name: str
    display_name: str | None
    employee_type: str
    date_of_birth: date
    gender: str
    photo: str | None
    blood_group: str | None
    marital_status: str | None
    mobile_number: str
    alternate_phone: str | None
    email: str
    emergency_contact_name: str | None
    emergency_contact_number: str | None
    address_line1: str
    address_line2: str | None
    country: str
    state: str
    district: str
    pincode: str
    permanent_address_line1: str | None
    permanent_address_line2: str | None
    permanent_country: str | None
    permanent_state: str | None
    permanent_district: str | None
    permanent_pincode: str | None
    date_of_joining: date
    department: str
    designation: str
    reporting_manager: str | None
    work_location: str
    employment_status: str
    aadhar_number: str | None
    pan_number: str | None
    uan_number: str | None
    bank_name: str | None
    account_number: str | None
    ifsc_code: str | None
    resume_file: str | None
    id_proof_file: str | None
    offer_letter_file: str | None
    experience: str | None
    skills: str | None
    qualifications: str | None
    remarks: str | None
    username: str
    login_email: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def include_user_fields(cls, value):
        if hasattr(value, "user"):
            data = {field: getattr(value, field) for field in cls.model_fields if hasattr(value, field)}
            data.update(
                username=value.user.username,
                login_email=value.user.email,
                role=value.user.role.name if value.user.role else "",
                is_active=value.user.is_active,
            )
            return data
        return value