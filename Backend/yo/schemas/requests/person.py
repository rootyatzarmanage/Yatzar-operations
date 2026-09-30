from pydantic import BaseModel, ConfigDict, Field, field_validator


class PersonCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., gt=0, le=150)
    phone_number: str = Field(..., min_length=7, max_length=20)

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "phone_number")
    @classmethod
    def validate_non_blank(cls, value: str) -> str:
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("must not be blank")
        return normalized_value


class PersonUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    age: int | None = Field(None, gt=0, le=150)
    phone_number: str | None = Field(None, min_length=7, max_length=20)

    model_config = ConfigDict(extra="forbid")

    @field_validator("name", "phone_number")
    @classmethod
    def validate_non_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("must not be blank")
        return normalized_value
