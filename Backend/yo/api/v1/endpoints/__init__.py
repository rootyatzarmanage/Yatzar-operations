from yo.api.v1.endpoints.employee import router as employee_router
from yo.api.v1.endpoints.role import router as role_router
from yo.api.v1.endpoints.support import router as support_router
from yo.api.v1.endpoints.contact import router as contact_router
from yo.api.v1.endpoints.workspace import router as workspace_router

__all__ = ["employee_router", "role_router", "support_router","contact_router","workspace_router"]
