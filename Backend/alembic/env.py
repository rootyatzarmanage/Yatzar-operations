import asyncio
import importlib
import json
import logging
from pathlib import Path
import pkgutil
from logging.config import fileConfig

from sqlalchemy import pool, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from yo.core.config import settings
from yo.core.database.base import Base
import yo.models

# Autogenerate must see every model, not just users and employees.
for module in pkgutil.iter_modules(yo.models.__path__):
    importlib.import_module(f"yo.models.{module.name}")

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Overwrite sqlalchemy.url with dynamic app settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema="public",
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata,
                      version_table_schema="public", compare_type=True)

    with context.begin_transaction():
        migration_context = context.get_context()
        command_fn = migration_context.opts.get("fn")
        if getattr(command_fn, "__name__", None) == "upgrade":
            # Serialize migrations, including adoption of legacy version rows.
            connection.execute(text("SELECT pg_advisory_xact_lock(20261017, 1)"))
            if connection.scalar(text("SELECT to_regclass('public.alembic_version')")):
                recorded = set(connection.scalars(text("SELECT version_num FROM public.alembic_version")))
                legacy = set(json.loads(Path(__file__).with_name("legacy_revisions.json").read_text()))
                if recorded and recorded.issubset(legacy):
                    logging.getLogger("alembic.runtime.migration").info(
                        "Adopting archived migration history through the non-destructive baseline: %s",
                        ", ".join(sorted(recorded)),
                    )
                    # This is transactional. A failed baseline restores these
                    # rows; no database is stamped past unexecuted schema work.
                    connection.execute(text("DELETE FROM public.alembic_version"))
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
