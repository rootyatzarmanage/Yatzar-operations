from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PersonCreateRequest(BaseModel):
    """Schema for creating a new person."""
    name: str = Field(..., min_length=1, max_length=100, examples=["John Doe"])
    age: int = Field(..., gt=0, le=150, examples=[28])
    phno: str = Field(..., min_length=7, max_length=20, examples=["+1234567890"])


class PersonUpdateRequest(BaseModel):
    """Schema for updating an existing person (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, examples=["Johnathan Doe"])
    age: Optional[int] = Field(None, gt=0, le=150, examples=[29])
    phno: Optional[str] = Field(None, min_length=7, max_length=20, examples=["+9876543210"])


class PersonResponse(BaseModel):
    """Schema for serializing person response."""
    id: UUID
    name: str
    age: int
    phno: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
