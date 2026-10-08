from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from yo.api.v1.router import api_v1_router
from yo.core.config import settings
from yo.core.database import engine
from yo.core.database import AsyncSessionLocal
from yo.core.database.base import Base
from yo.core.exceptions import AppException
from yo.core.schemas.responses import ErrorResponse
from yo.seeders.admin import seed_default_data


@asynccontextmanager
async def lifespan(application: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        await seed_default_data(session)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="YO FastAPI backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exception: AppException):
    return JSONResponse(
        status_code=exception.status_code,
        content=ErrorResponse(
            message=exception.message,
            errors=exception.errors,
        ).model_dump(),
    )


app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "ok",
        "api_v1": settings.API_V1_PREFIX,
    }
