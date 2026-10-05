from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EmployeeFields(BaseModel):
    employee_name: str = Field(..., min_length=1, max_length=150)
    display_name: str | None = Field(None, max_length=150)
    employee_type: str = Field(..., min_length=1, max_length=50)
    date_of_birth: date
    gender: str = Field(..., min_length=1, max_length=20)
    blood_group: str | None = None
    marital_status: str | None = None
    photo: str | None = None
    mobile_number: str = Field(..., min_length=1, max_length=30)
    alternate_phone: str | None = None
    email: str
    emergency_contact_name: str | None = None
    emergency_contact_number: str | None = None
    address_line1: str = Field(..., min_length=1, max_length=255)
    address_line2: str | None = None
    country: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    district: str = Field(..., min_length=1, max_length=100)
    pincode: str = Field(..., min_length=1, max_length=20)
    permanent_address_line1: str | None = None
    permanent_address_line2: str | None = None
    permanent_country: str | None = None
    permanent_state: str | None = None
    permanent_district: str | None = None
    permanent_pincode: str | None = None
    date_of_joining: date
    department: str = Field(..., min_length=1, max_length=100)
    designation: str = Field(..., min_length=1, max_length=100)
    reporting_manager: str | None = None
    work_location: str = Field(..., min_length=1, max_length=150)
    employment_status: str = Field(..., min_length=1, max_length=50)
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

    @field_validator("employee_name", "mobile_number", "address_line1", "country", "state", "district", "pincode", "department", "designation", "work_location", "employment_status")
    @classmethod
    def validate_non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @field_validator("email", "login_email", check_fields=False)
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip()
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("must be a valid email address")
        return value


class EmployeeCreateRequest(EmployeeFields):
    employee_code: str | None = Field(None, min_length=3, max_length=30)
    username: str = Field(..., min_length=3, max_length=100)
    login_email: str
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., min_length=1, max_length=50)
    is_active: bool = True
    model_config = ConfigDict(extra="forbid")


class EmployeeUpdateRequest(BaseModel):
    employee_name: str | None = None
    display_name: str | None = None
    employee_type: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    blood_group: str | None = None
    marital_status: str | None = None
    photo: str | None = None
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
    password: str | None = Field(None, min_length=8, max_length=128)
    role: str | None = None
    is_active: bool | None = None
    model_config = ConfigDict(extra="forbid")