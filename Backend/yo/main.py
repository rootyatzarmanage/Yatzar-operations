from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from yo.api.v1.router import api_v1_router
from yo.core.config import settings
from yo.core.database import engine
from yo.core.database import AsyncSessionLocal
from yo.core.database.base import Base
from yo.core.exceptions import AppException
from yo.core.storage import STORAGE_DIR
from yo.core.schemas.responses import ErrorResponse
from yo.seeders.admin import seed_default_data
from fastapi.responses import FileResponse
from yo.core.auth.dependencies import CurrentUser
from yo.core.database import DatabaseSession
from yo.models.contact import Contact
from yo.repositories.contact import ContactRepository
from yo.repositories.workspace import WorkspaceRepository
from yo.services.role import RoleService
from sqlalchemy import inspect, select, text
from yo.services.mail_worker import run_mail_worker


@asynccontextmanager
async def lifespan(application: FastAPI):
    def check_schema(connection):
        inspector = inspect(connection)
        tables = set(inspector.get_table_names())
        if "alembic_version" not in tables or not connection.scalar(text("SELECT version_num FROM alembic_version LIMIT 1")):
            raise RuntimeError("Database migrations are not initialized. Run `alembic upgrade head` from Backend before starting the API.")
        missing = []
        for table in Base.metadata.sorted_tables:
            columns = {c["name"] for c in inspector.get_columns(table.name)} if table.name in tables else set()
            missing.extend(f"{table.name}.{column.name}" for column in table.columns if column.name not in columns)
        if missing:
            raise RuntimeError("Database schema is outdated. Run `alembic upgrade head`. Missing: " + ", ".join(missing))

    async with engine.connect() as connection:
        await connection.run_sync(check_schema)
    async with AsyncSessionLocal() as session:
        await seed_default_data(session)
    stop = asyncio.Event()
    worker = asyncio.create_task(run_mail_worker(stop)) if settings.MAIL_WORKER_ENABLED else None
    try:
        yield
    finally:
        stop.set()
        if worker:
            await worker
        await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="YO FastAPI backend",
    lifespan=lifespan,
)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

@app.get("/storage/{file_path:path}", include_in_schema=False)
async def contact_image(file_path: str, session: DatabaseSession, current_user: CurrentUser):
    destination = (STORAGE_DIR / file_path).resolve()
    if not destination.is_relative_to(STORAGE_DIR.resolve()) or not destination.is_file():
        raise AppException("Image not found.", 404)
    allowed = await session.scalar(select(Contact.id).where(
        Contact.photo == f"storage/{file_path}", Contact.deleted_at.is_(None),
        ContactRepository.access_condition(current_user.id),
    ).limit(1))
    if allowed is None:
        workspace_id = await WorkspaceRepository(session).get_id_by_image(
            f"storage/{file_path}", current_user.id,
        )
        if workspace_id is None:
            raise AppException("Image not found.", 404)
        await RoleService(session).check_permission(current_user, "workspace", "view")
    return FileResponse(destination, headers={"Cache-Control": "private, no-store"})


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
