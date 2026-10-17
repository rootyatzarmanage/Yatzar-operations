from datetime import date
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class EmployeeRequestBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator(
        "employee_code", "employee_name", "employee_type", "gender", "mobile_number",
        "address_line1", "country", "state", "district", "pincode", "department",
        "designation", "work_location", "employment_status", "username", "role",
        mode="before", check_fields=False,
    )
    @classmethod
    def validate_non_blank(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("must not be blank")
        return value


class EmployeeCreateRequest(EmployeeRequestBase):
    model_config = ConfigDict(extra="forbid")
    employee_name: str = Field(min_length=1, max_length=150)
    display_name: str | None = Field(default=None, max_length=150)
    employee_type: str = Field(min_length=1, max_length=50)
    date_of_birth: date
    gender: str = Field(min_length=1, max_length=20)
    blood_group: str | None = Field(default=None, max_length=10)
    marital_status: str | None = Field(default=None, max_length=30)
    photo: str | None = None
    workspace_ids: list[UUID] = Field(default_factory=list)

    mobile_number: str = Field(min_length=1, max_length=30)
    alternate_phone: str | None = Field(default=None, max_length=30)
    email: EmailStr = Field(max_length=255)
    emergency_contact_name: str | None = Field(default=None, max_length=150)
    emergency_contact_number: str | None = Field(default=None, max_length=30)

    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    country: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=1, max_length=20)

    permanent_address_line1: str | None = Field(default=None, max_length=255)
    permanent_address_line2: str | None = Field(default=None, max_length=255)
    permanent_country: str | None = Field(default=None, max_length=100)
    permanent_state: str | None = Field(default=None, max_length=100)
    permanent_district: str | None = Field(default=None, max_length=100)
    permanent_pincode: str | None = Field(default=None, max_length=20)

    date_of_joining: date
    department: str = Field(min_length=1, max_length=100)
    designation: str = Field(min_length=1, max_length=100)
    reporting_manager: str | None = Field(default=None, max_length=150)
    work_location: str = Field(min_length=1, max_length=150)
    employment_status: str = Field(min_length=1, max_length=50)

    aadhar_number: str | None = Field(default=None, max_length=30)
    pan_number: str | None = Field(default=None, max_length=20)
    uan_number: str | None = Field(default=None, max_length=30)

    bank_name: str | None = Field(default=None, max_length=150)
    account_number: str | None = Field(default=None, max_length=50)
    ifsc_code: str | None = Field(default=None, max_length=20)

    resume_file: str | None = Field(default=None, max_length=500)
    id_proof_file: str | None = Field(default=None, max_length=500)
    offer_letter_file: str | None = Field(default=None, max_length=500)

    experience: str | None = Field(default=None, max_length=100)
    skills: str | None = None
    qualifications: str | None = None
    remarks: str | None = None

    username: str = Field(min_length=3, max_length=100)
    login_email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(min_length=1, max_length=50)
    is_active: bool = True

    status: Literal[1] = 1


class EmployeeDraftRequest(EmployeeRequestBase):
    model_config = ConfigDict(extra="forbid")

    employee_name: str | None = Field(default=None, min_length=1, max_length=150)
    display_name: str | None = Field(default=None, max_length=150)
    employee_type: str | None = Field(default=None, min_length=1, max_length=50)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, min_length=1, max_length=20)
    blood_group: str | None = Field(default=None, max_length=10)
    marital_status: str | None = Field(default=None, max_length=30)
    photo: str | None = None
    workspace_ids: list[UUID] | None = None

    mobile_number: str | None = Field(default=None, min_length=1, max_length=30)
    alternate_phone: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = Field(default=None, max_length=255)
    emergency_contact_name: str | None = Field(default=None, max_length=150)
    emergency_contact_number: str | None = Field(default=None, max_length=30)

    address_line1: str | None = Field(default=None, min_length=1, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    state: str | None = Field(default=None, min_length=1, max_length=100)
    district: str | None = Field(default=None, min_length=1, max_length=100)
    pincode: str | None = Field(default=None, min_length=1, max_length=20)

    permanent_address_line1: str | None = Field(default=None, max_length=255)
    permanent_address_line2: str | None = Field(default=None, max_length=255)
    permanent_country: str | None = Field(default=None, max_length=100)
    permanent_state: str | None = Field(default=None, max_length=100)
    permanent_district: str | None = Field(default=None, max_length=100)
    permanent_pincode: str | None = Field(default=None, max_length=20)

    date_of_joining: date | None = None
    department: str | None = Field(default=None, min_length=1, max_length=100)
    designation: str | None = Field(default=None, min_length=1, max_length=100)
    reporting_manager: str | None = Field(default=None, max_length=150)
    work_location: str | None = Field(default=None, min_length=1, max_length=150)
    employment_status: str | None = Field(default=None, min_length=1, max_length=50)

    aadhar_number: str | None = Field(default=None, max_length=30)
    pan_number: str | None = Field(default=None, max_length=20)
    uan_number: str | None = Field(default=None, max_length=30)

    bank_name: str | None = Field(default=None, max_length=150)
    account_number: str | None = Field(default=None, max_length=50)
    ifsc_code: str | None = Field(default=None, max_length=20)

    resume_file: str | None = Field(default=None, max_length=500)
    id_proof_file: str | None = Field(default=None, max_length=500)
    offer_letter_file: str | None = Field(default=None, max_length=500)

    experience: str | None = Field(default=None, max_length=100)
    skills: str | None = None
    qualifications: str | None = None
    remarks: str | None = None

    status: Literal[0] = 0


class EmployeeUpdateRequest(EmployeeRequestBase):
    model_config = ConfigDict(extra="forbid")

    employee_name: str | None = Field(default=None, min_length=1, max_length=150)
    display_name: str | None = Field(default=None, max_length=150)
    employee_type: str | None = Field(default=None, min_length=1, max_length=50)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, min_length=1, max_length=20)
    blood_group: str | None = Field(default=None, max_length=10)
    marital_status: str | None = Field(default=None, max_length=30)
    photo: str | None = None
    workspace_ids: list[UUID] | None = None

    mobile_number: str | None = Field(default=None, min_length=1, max_length=30)
    alternate_phone: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = Field(default=None, max_length=255)
    emergency_contact_name: str | None = Field(default=None, max_length=150)
    emergency_contact_number: str | None = Field(default=None, max_length=30)

    address_line1: str | None = Field(default=None, min_length=1, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    country: str | None = Field(default=None, min_length=1, max_length=100)
    state: str | None = Field(default=None, min_length=1, max_length=100)
    district: str | None = Field(default=None, min_length=1, max_length=100)
    pincode: str | None = Field(default=None, min_length=1, max_length=20)

    permanent_address_line1: str | None = Field(default=None, max_length=255)
    permanent_address_line2: str | None = Field(default=None, max_length=255)
    permanent_country: str | None = Field(default=None, max_length=100)
    permanent_state: str | None = Field(default=None, max_length=100)
    permanent_district: str | None = Field(default=None, max_length=100)
    permanent_pincode: str | None = Field(default=None, max_length=20)

    date_of_joining: date | None = None
    department: str | None = Field(default=None, min_length=1, max_length=100)
    designation: str | None = Field(default=None, min_length=1, max_length=100)
    reporting_manager: str | None = Field(default=None, max_length=150)
    work_location: str | None = Field(default=None, min_length=1, max_length=150)
    employment_status: str | None = Field(default=None, min_length=1, max_length=50)

    aadhar_number: str | None = Field(default=None, max_length=30)
    pan_number: str | None = Field(default=None, max_length=20)
    uan_number: str | None = Field(default=None, max_length=30)

    bank_name: str | None = Field(default=None, max_length=150)
    account_number: str | None = Field(default=None, max_length=50)
    ifsc_code: str | None = Field(default=None, max_length=20)

    resume_file: str | None = Field(default=None, max_length=500)
    id_proof_file: str | None = Field(default=None, max_length=500)
    offer_letter_file: str | None = Field(default=None, max_length=500)

    experience: str | None = Field(default=None, max_length=100)
    skills: str | None = None
    qualifications: str | None = None
    remarks: str | None = None

    username: str | None = Field(default=None, min_length=3, max_length=100)
    login_email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: str | None = Field(default=None, min_length=1, max_length=50)
    is_active: bool | None = None
