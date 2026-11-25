import re

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class ProfileResponse(BaseModel):
    name: str
    email: EmailStr
    mobile: str
    country: str
    state: str
    district: str
    pincode: str