from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field


ResponseData = TypeVar("ResponseData")


class SuccessResponse(BaseModel, Generic[ResponseData]):
    success: bool = True
    message: str = "Operation successful"
    data: ResponseData | None = None
    validation: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: Any = None
