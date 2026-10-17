"""Store workspace assignments on user accounts for every role."""
from alembic import op
import sqlalchemy as sa

revision = "8d2f4a6c9b10"
down_revision = "7c9e1a3b5d20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_workspaces",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "workspace_id"),
    )
    op.create_index("ix_user_workspaces_workspace_id", "user_workspaces", ["workspace_id"])
    op.execute(sa.text("""
        INSERT INTO user_workspaces (user_id, workspace_id)
        SELECT DISTINCT e.user_id, ew.workspace_id
        FROM employee_workspaces ew
        JOIN employees e ON e.id = ew.employee_id
        WHERE e.user_id IS NOT NULL
        ON CONFLICT (user_id, workspace_id) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_table("user_workspaces")
