# YO Backend

FastAPI backend using PostgreSQL with SQLAlchemy async sessions and Alembic migrations.

## Run

Set `DATABASE_URL` to a PostgreSQL asyncpg URL in `.env`, install `requirements.txt`, and run:

```powershell
python run.py
```

The application is exposed at `/api/v1`. Request schemas live under `yo/schemas/requests`; response schemas live under `yo/schemas/responses`.

All request bodies are validated by Pydantic before service execution. Successful responses include an empty `validation` object. Models use `created_at`, `updated_at`, `deleted_at`, and `deleted_by`; delete operations are soft deletes and normal queries exclude deleted rows.
