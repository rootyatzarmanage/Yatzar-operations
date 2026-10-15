from fastapi import APIRouter

from yo.api.v1.endpoints.employee import router as employee_router
from yo.api.v1.endpoints.role import router as role_router
from yo.api.v1.endpoints.support import router as support_router
from yo.api.v1.endpoints.auth import router as auth_router
from yo.api.v1.endpoints.workspace import router as workspace_router
from yo.api.v1.endpoints.contact import router as contact_router
from yo.api.v1.endpoints.tag import router as tag_router
from yo.api.v1.endpoints.task import router as task_router
from yo.api.v1.endpoints.meeting import router as meeting_router
from yo.api.v1.endpoints.call import router as call_router
from yo.api.v1.endpoints.campaign import router as campaigns_router
from yo.api.v1.endpoints.event_webinar import router as event_webinar_router

api_v1_router = APIRouter()
api_v1_router.include_router(employee_router)
api_v1_router.include_router(role_router)
api_v1_router.include_router(support_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(workspace_router)
api_v1_router.include_router(contact_router)
api_v1_router.include_router(tag_router)
api_v1_router.include_router(task_router)
api_v1_router.include_router(meeting_router)
api_v1_router.include_router(call_router)
api_v1_router.include_router(campaigns_router)
api_v1_router.include_router(event_webinar_router)