from fastapi import APIRouter

from yo.api.v1.endpoints.employee import router as employee_router
from yo.api.v1.endpoints.role import router as role_router
from yo.api.v1.endpoints.support import router as support_router
from yo.api.v1.endpoints.workspace import router as workspace_router

api_v1_router = APIRouter()
api_v1_router.include_router(employee_router)
api_v1_router.include_router(role_router)
api_v1_router.include_router(support_router)
api_v1_router.include_router(workspace_router)
