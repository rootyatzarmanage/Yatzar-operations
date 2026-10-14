from yo.api.v1.endpoints.employee import router as employee_router
from yo.api.v1.endpoints.role import router as role_router
from yo.api.v1.endpoints.support import router as support_router
from yo.api.v1.endpoints.contact import router as contact_router
from yo.api.v1.endpoints.workspace import router as workspace_router
from yo.api.v1.endpoints.task import router as task_router
from yo.api.v1.endpoints.meeting import router as meeting_router
from yo.api.v1.endpoints.call import router as call_router
from yo.api.v1.endpoints.campaign import router as campaigns_router

__all__ = [
    "employee_router", 
    "role_router", 
    "support_router",
    "contact_router",
    "workspace_router",
    "task_router",
    "meeting_router",
    "call_router",
    "campaigns_router"
    ]
