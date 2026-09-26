from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ycpa.core.config import settings
from ycpa.core.database import engine
from ycpa.models.base import Base
from ycpa.core.exceptions import AppException
from ycpa.core.schemas.responses import ErrorResponse
from ycpa.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist for immediate out-of-the-box readiness
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose database engine connections
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="FastAPI Backend demonstrating the YCPA architecture: Route -> Schema -> Service -> Repository -> Model -> DB",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Custom exception handler to return structured error responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            message=exc.message,
            errors=exc.errors
        ).model_dump()
    )


# Attach v1 routers
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "ok",
        "api_v1": settings.API_V1_PREFIX
    }
