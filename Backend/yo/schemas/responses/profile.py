import re

from pydantic import BaseModel, EmailStr


class ProfileResponse(BaseModel):
    name: str
    email: EmailStr
    mobile: str
    country: str
    state: str
    district: str
    pincode: str