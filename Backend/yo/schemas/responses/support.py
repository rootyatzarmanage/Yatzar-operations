from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    field_validator,
)


class DropdownOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    value: str

    @field_validator("value")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip()
