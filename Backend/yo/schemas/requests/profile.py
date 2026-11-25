import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class ProfileUpdateRequest(BaseModel):
    name: str = Field(max_length=150)
    email: EmailStr
    mobile: str = Field(max_length=30)
    country: str = Field(max_length=100)
    state: str = Field(max_length=100)
    district: str = Field(max_length=100)
    pincode: str = Field(max_length=20)

    @field_validator("name", "mobile", "country", "state", "district", "pincode", mode="before")
    @classmethod
    def strip_profile_values(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value
    name: str
    email: EmailStr
    mobile: str
    country: str
    state: str
    district: str
    pincode: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=1, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_strength(cls, value: str) -> str:
        if not re.search(r"[a-z]", value) or not re.search(r"[A-Z]", value) or not re.search(r"\d", value):
            raise ValueError("Password must contain an uppercase letter, a lowercase letter and a number.")
        return value

    @model_validator(mode="after")
    def validate_passwords(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirm password do not match.")
        if self.new_password == self.current_password:
            raise ValueError("New password must be different from the current password.")
        return self
