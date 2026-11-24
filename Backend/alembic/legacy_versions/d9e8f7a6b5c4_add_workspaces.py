"""add workspaces table

Revision ID: d9e8f7a6b5c4
Revises: c8a4e1b2d3f4
Create Date: 2026-10-03

"""
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = "d9e8f7a6b5c4"
down_revision: Union[str, None] = "c8a4e1b2d3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if context.is_offline_mode():
        op.create_table(
            "workspaces",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_by", sa.Uuid(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_by", sa.Uuid(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_by", sa.Uuid(), nullable=True),
            sa.CheckConstraint(
                "status IN ('Enabled', 'Disabled')",
                name="ck_workspaces_status",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "uq_workspaces_active_name",
            "workspaces",
            [sa.text("lower(name)")],
            unique=True,
            postgresql_where=sa.text("deleted_at IS NULL"),
        )
        return

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("workspaces"):
        op.create_table(
            "workspaces",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=150), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_by", sa.Uuid(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_by", sa.Uuid(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_by", sa.Uuid(), nullable=True),
            sa.CheckConstraint(
                "status IN ('Enabled', 'Disabled')",
                name="ck_workspaces_status",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        inspector = sa.inspect(bind)
    index_names = {
        index["name"] for index in inspector.get_indexes("workspaces")
    }
    if "uq_workspaces_active_name" not in index_names:
        op.create_index(
            "uq_workspaces_active_name",
            "workspaces",
            [sa.text("lower(name)")],
            unique=True,
            postgresql_where=sa.text("deleted_at IS NULL"),
            sqlite_where=sa.text("deleted_at IS NULL"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("workspaces"):
        index_names = {
            index["name"] for index in inspector.get_indexes("workspaces")
        }
        if "uq_workspaces_active_name" in index_names:
            op.drop_index("uq_workspaces_active_name", table_name="workspaces")
        op.drop_table("workspaces")
