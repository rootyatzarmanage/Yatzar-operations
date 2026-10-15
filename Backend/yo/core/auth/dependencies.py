from typing import Annotated

from fastapi import Depends

from yo.api.v1.endpoints.auth import require_user
from yo.models.user import User


CurrentUser = Annotated[User, Depends(require_user)]

