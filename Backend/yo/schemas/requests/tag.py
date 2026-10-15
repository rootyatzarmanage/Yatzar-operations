from pydantic import BaseModel, ConfigDict, Field


class TagCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    status: int = Field(default=1, ge=0, le=1)


class TagUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=100)
    status: int | None = Field(default=None, ge=0, le=1)