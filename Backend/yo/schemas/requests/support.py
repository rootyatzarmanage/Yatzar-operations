from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class DraftRequest(BaseModel):
    data: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="forbid")


class DropdownOptionRequest(BaseModel):
    value: str = Field(..., min_length=1, max_length=150)

    model_config = ConfigDict(extra="forbid")