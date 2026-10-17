from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from yo.core.exceptions import AppException
from yo.core.security import decode_session, verify_password
from yo.models.user import User
from yo.repositories.user import UserRepository
from yo.schemas.requests.auth import LoginRequest


class AuthService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)

    async def get_session_user(self, session_token: str | None) -> User:
        user_id = decode_session(session_token)
        if not user_id:
            raise AppException("Authentication is required.", 401)
        user = await self.repository.get_active(user_id=UUID(user_id))
        if not user:
            raise AppException("Authentication is required.", 401)
        return user

    async def authenticate(self, request: LoginRequest) -> User:
        user = await self.repository.get_active(identifier=request.identifier)
        if not user or not verify_password(request.password, user.password_hash):
            raise AppException("Invalid username/email or password.", 401)
        return user
