from pydantic import BaseModel, ConfigDict, Field, field_validator


class PermissionInput(BaseModel):
    create: bool = False
    view: bool = False
    update: bool = False
    delete: bool = False

    model_config = ConfigDict(extra="forbid")


class RoleCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    permissions: dict[str, PermissionInput] = Field(default_factory=dict)

    model_config = ConfigDict(extra="forbid")

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class RoleUpdateRequest(RoleCreateRequest):
    pass