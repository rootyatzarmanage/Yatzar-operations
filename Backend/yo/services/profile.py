from sqlalchemy.exc import IntegrityError

from yo.core.exceptions import AppException
from yo.core.security import hash_password, verify_password
from yo.models.user import User
from yo.repositories.user import UserRepository
from yo.schemas.requests.profile import ChangePasswordRequest, ProfileUpdateRequest
from yo.schemas.responses.profile import ProfileResponse


class ProfileService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def change_password(self, user: User, request: ChangePasswordRequest) -> User:
        if not verify_password(request.current_password, user.password_hash):
            raise AppException("Current password is incorrect.", 400)
        return await self.repository.update_password(user, hash_password(request.new_password))

    @staticmethod
    def get_profile(user: User) -> ProfileResponse:
        employee = user.employee
        user_name = " ".join(part for part in (user.first_name, user.last_name) if part)
        employee_name = (
            (employee.display_name or employee.employee_name) if employee is not None else None
        )

        def profile_value(employee_value: str | None, user_value: str | None) -> str:
            return employee_value if employee_value is not None else user_value or ""

        return ProfileResponse(
            name=employee_name or user_name or user.username,
            email=user.email,
            mobile=profile_value(
                employee.mobile_number if employee is not None else None,
                user.mobile_number,
            ),
            country=profile_value(employee.country if employee is not None else None, user.country),
            state=profile_value(employee.state if employee is not None else None, user.state),
            district=profile_value(employee.district if employee is not None else None, user.district),
            pincode=profile_value(employee.pincode if employee is not None else None, user.pincode),
        )

    async def update_profile(self, user: User, request: ProfileUpdateRequest) -> ProfileResponse:
        email = str(request.email)
        existing = await self.repository.get_by_email(email, user.id)
        if existing is not None:
            raise AppException("That email address is already in use.", 409)

        name_parts = request.name.split(maxsplit=1)
        values = {
            "email": email,
            "first_name": name_parts[0] if name_parts else None,
            "last_name": name_parts[1] if len(name_parts) > 1 else None,
            "mobile_number": request.mobile or None,
            "country": request.country or None,
            "state": request.state or None,
            "district": request.district or None,
            "pincode": request.pincode or None,
        }
        employee_values = {
            "employee_name": request.name or None,
            "display_name": request.name or None,
            "email": email,
            "mobile_number": request.mobile or None,
            "country": request.country or None,
            "state": request.state or None,
            "district": request.district or None,
            "pincode": request.pincode or None,
        }
        try:
            await self.repository.update_profile(user, values, employee_values)
        except IntegrityError as exc:
            raise AppException("That email address is already in use.", 409) from exc
        return self.get_profile(user)
