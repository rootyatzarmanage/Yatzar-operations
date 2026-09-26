from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, message: str, errors: dict | list | None = None):
        super().__init__(status_code=status_code, detail=message)
        self.message = message
        self.errors = errors


class NotFoundException(AppException):
    def __init__(self, resource: str, identifier: str | int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            message=f"{resource} with identifier '{identifier}' not found."
        )


class ConflictException(AppException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            message=message
        )


class BadRequestException(AppException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=message
        )
