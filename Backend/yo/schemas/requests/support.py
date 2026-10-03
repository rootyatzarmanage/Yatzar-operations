from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DraftRequest(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="forbid")

    @field_validator("data")
    @classmethod
    def reject_password_fields(cls, value: dict[str, Any]) -> dict[str, Any]:
        sensitive_keys = {"password", "password_hash"}
        if sensitive_keys.intersection(key.lower() for key in value):
            raise ValueError("Drafts must not contain passwords or password hashes.")
        return value


class DropdownOptionRequest(BaseModel):
    value: str = Field(..., min_length=1, max_length=150)

    model_config = ConfigDict(extra="forbid")