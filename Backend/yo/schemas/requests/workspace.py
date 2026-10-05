from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


WorkspaceStatus = Literal["Enabled", "Disabled"]


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: str = Field(..., min_length=1, max_length=2000)
    status: WorkspaceStatus = "Enabled"

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "description")
    @classmethod
    def validate_non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = Field(None, min_length=1, max_length=2000)
    status: WorkspaceStatus | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "description")
    @classmethod
    def validate_non_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value

    @model_validator(mode="after")
    def reject_null_updates(self):
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        return self
