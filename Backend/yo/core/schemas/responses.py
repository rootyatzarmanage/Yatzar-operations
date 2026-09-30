from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation successful"
    data: T | None = None
    validation: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: Any = None
