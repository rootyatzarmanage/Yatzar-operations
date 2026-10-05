from datetime import date
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


EMPLOYEE_STRING_LIMITS = {
    "employee_code": 30,
    "employee_name": 150,
    "display_name": 150,
    "employee_type": 50,
    "gender": 20,
    "blood_group": 10,
    "marital_status": 30,
    "photo": 500,
    "mobile_number": 30,
    "alternate_phone": 30,
    "email": 255,
    "emergency_contact_name": 150,
    "emergency_contact_number": 30,
    "address_line1": 255,
    "address_line2": 255,
    "country": 100,
    "state": 100,
    "district": 100,
    "pincode": 20,
    "permanent_address_line1": 255,
    "permanent_address_line2": 255,
    "permanent_country": 100,
    "permanent_state": 100,
    "permanent_district": 100,
    "permanent_pincode": 20,
    "department": 100,
    "designation": 100,
    "reporting_manager": 150,
    "work_location": 150,
    "employment_status": 50,
    "aadhar_number": 30,
    "pan_number": 20,
    "uan_number": 30,
    "bank_name": 150,
    "account_number": 50,
    "ifsc_code": 20,
    "resume_file": 500,
    "id_proof_file": 500,
    "offer_letter_file": 500,
    "experience": 100,
    "username": 100,
    "login_email": 255,
    "role": 50,
}


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
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("must be a valid email address")
        return value

    @field_validator("*", mode="before")
    @classmethod
    def strip_string_values(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_string_limits(self):
        for field_name, max_length in EMPLOYEE_STRING_LIMITS.items():
            value = getattr(self, field_name, None)
            if isinstance(value, str) and len(value) > max_length:
                raise ValueError(f"{field_name} must be at most {max_length} characters")
        return self


class EmployeeCreateRequest(EmployeeFields):
    employee_code: str | None = Field(None, min_length=3, max_length=30)
    username: str = Field(..., min_length=3, max_length=100)
    login_email: str
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., min_length=1, max_length=50)
    is_active: bool = True
    model_config = ConfigDict(extra="forbid")


class EmployeeUpdateRequest(BaseModel):
    employee_code: str | None = Field(None, min_length=3, max_length=30)
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

    @field_validator("*", mode="before")
    @classmethod
    def strip_string_values(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", "login_email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("must be a valid email address")
        return value

    @model_validator(mode="after")
    def validate_patch_values(self):
        non_nullable_fields = {
            "employee_code",
            "employee_name",
            "employee_type",
            "date_of_birth",
            "gender",
            "mobile_number",
            "email",
            "address_line1",
            "country",
            "state",
            "district",
            "pincode",
            "date_of_joining",
            "department",
            "designation",
            "work_location",
            "employment_status",
            "username",
            "login_email",
            "password",
            "role",
            "is_active",
        }
        for field_name in self.model_fields_set & non_nullable_fields:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        for field_name in ("employee_name", "mobile_number", "email", "address_line1",
                           "employee_code", "employee_type", "gender", "country",
                           "state", "district", "pincode", "department",
                           "designation", "work_location", "employment_status",
                           "username", "login_email", "password", "role"):
            value = getattr(self, field_name)
            if field_name in self.model_fields_set and isinstance(value, str) and not value:
                raise ValueError(f"{field_name} must not be blank")
        for field_name, max_length in EMPLOYEE_STRING_LIMITS.items():
            value = getattr(self, field_name, None)
            if isinstance(value, str) and len(value) > max_length:
                raise ValueError(f"{field_name} must be at most {max_length} characters")
        if "password" in self.model_fields_set and self.password is not None:
            if len(self.password) < 8 or len(self.password) > 128:
                raise ValueError("password must be between 8 and 128 characters")
        return self