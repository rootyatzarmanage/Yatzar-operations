from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class DropdownOptionRequest(BaseModel):
    value: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    model_config = ConfigDict(extra="forbid")

    @field_validator("value")
    @classmethod
    def validate_value(
        cls,
        value: str,
    ) -> str:
        value = value.strip()

        if not value:
            raise ValueError(
                "Value cannot be empty or contain only spaces"
            )

        return value