from yo.core.exceptions import AppException
from yo.core.security import hash_password, verify_password
from yo.models.user import User
from yo.repositories.user import UserRepository
from yo.schemas.requests.profile import ChangePasswordRequest


class ProfileService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def change_password(self, user: User, request: ChangePasswordRequest) -> User:
        if not verify_password(request.current_password, user.password_hash):
            raise AppException("Current password is incorrect.", 400)
        return await self.repository.update_password(user, hash_password(request.new_password))
