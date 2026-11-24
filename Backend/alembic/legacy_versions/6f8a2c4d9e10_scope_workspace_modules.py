from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa


revision: str = "6f8a2c4d9e10"
down_revision: Union[str, None] = "22ba85f62106"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = (
    "tasks", "meetings", "calls", "campaigns", "email_marketing", "event_webinars",
)


def upgrade() -> None:
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())
    for table in TABLES:
        columns = set() if inspector is None else {
            column["name"] for column in inspector.get_columns(table)
        }
        if "workspace_id" not in columns:
            op.add_column(table, sa.Column("workspace_id", sa.Uuid(), nullable=True))
        foreign_keys = [] if inspector is None else inspector.get_foreign_keys(table)
        if not any(fk["constrained_columns"] == ["workspace_id"] for fk in foreign_keys):
            op.create_foreign_key(
                f"fk_{table}_workspace_id", table, "workspaces",
                ["workspace_id"], ["id"], ondelete="CASCADE",
            )
        indexes = [] if inspector is None else inspector.get_indexes(table)
        if not any(index["column_names"] == ["workspace_id"] for index in indexes):
            op.create_index(f"ix_{table}_workspace_id", table, ["workspace_id"])


def downgrade() -> None:
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())
    for table in reversed(TABLES):
        if inspector is None:
            op.drop_index(f"ix_{table}_workspace_id", table_name=table)
            op.drop_constraint(f"fk_{table}_workspace_id", table, type_="foreignkey")
        else:
            for index in inspector.get_indexes(table):
                if index["column_names"] == ["workspace_id"]:
                    op.drop_index(index["name"], table_name=table)
            for fk in inspector.get_foreign_keys(table):
                if fk["constrained_columns"] == ["workspace_id"]:
                    op.drop_constraint(fk["name"], table, type_="foreignkey")
        op.drop_column(table, "workspace_id")
