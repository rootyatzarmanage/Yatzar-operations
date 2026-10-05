from typing import Any


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400, errors: Any = None):
        self.message = message
        self.status_code = status_code
        self.errors = errors
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, resource: str, identifier: str):
        super().__init__(f"{resource} with id '{identifier}' was not found.", 404)


class ConflictException(AppException):
    def __init__(self, message: str):
        super().__init__(message, 409)
