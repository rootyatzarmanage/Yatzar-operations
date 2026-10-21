import logging
from typing import Annotated
from fastapi import APIRouter,Depends,HTTPException,status

from yo.api.v1.endpoints.auth import require_user
from yo.core.database import DatabaseSession
from yo.core.exceptions import AppException
from yo.core.schemas.responses import SuccessResponse
from yo.models.user import User
from yo.schemas.requests.profile import ChangePasswordRequest,ProfileAddressRequest,ProfilePhotoRequest,ProfileUpdateRequest
from yo.schemas.responses.profile import ProfileResponse
from yo.services.profile import ProfileService


