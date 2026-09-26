from fastapi import APIRouter
from ycpa.api.v1.endpoints.person import router as person_router

api_v1_router = APIRouter()
api_v1_router.include_router(person_router)
