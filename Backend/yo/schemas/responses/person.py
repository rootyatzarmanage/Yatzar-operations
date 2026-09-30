from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PersonResponse(BaseModel):
    """Response representation of a person."""

    id: UUID
    name: str
    age: int
    phone_number: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
