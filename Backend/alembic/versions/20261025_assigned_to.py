import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261025_assigned_to"
down_revision = "20261024_meeting_products"
branch_labels = None
depends_on = None

TABLES = ("tasks", "meetings", "calls")


def upgrade():
    for table in TABLES:
        op.add_column(table, sa.Column("assigned_to", postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_assigned_to_users", table, "users", ["assigned_to"], ["id"], ondelete="SET NULL",
        )
        op.create_index(f"ix_{table}_assigned_to", table, ["assigned_to"])


def downgrade():
    for table in reversed(TABLES):
        op.drop_index(f"ix_{table}_assigned_to", table_name=table)
        op.drop_constraint(f"fk_{table}_assigned_to_users", table, type_="foreignkey")
        op.drop_column(table, "assigned_to")
