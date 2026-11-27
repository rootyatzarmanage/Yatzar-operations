"""Scope tags to workspaces and store call follow-up notes."""
from alembic import op
import sqlalchemy as sa


revision = "20261127_workspace_tags"
down_revision = "20261125_user_profile_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tags", sa.Column("workspace_id", sa.UUID(), nullable=True))
    # Preserve ownership where existing contact usage identifies exactly one
    # workspace. Shared or unused legacy tags remain unassigned for review.
    op.execute("""
        UPDATE tags AS tag
        SET workspace_id = usage.workspace_id
        FROM (
            SELECT tag_id, MIN(workspace_id::text)::uuid AS workspace_id
            FROM contacts
            WHERE tag_id IS NOT NULL AND workspace_id IS NOT NULL
            GROUP BY tag_id
            HAVING COUNT(DISTINCT workspace_id) = 1
        ) AS usage
        WHERE tag.id = usage.tag_id
    """)
    op.create_foreign_key(
        "fk_tags_workspace_id_workspaces", "tags", "workspaces",
        ["workspace_id"], ["id"], ondelete="CASCADE",
    )
    op.create_index("ix_tags_workspace_id", "tags", ["workspace_id"])
    op.drop_index("ix_tags_name", table_name="tags")
    op.create_index(
        "uq_tags_workspace_name", "tags", ["workspace_id", "name"], unique=True,
    )
    op.add_column("calls", sa.Column("follow_up", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("calls", "follow_up")
    op.drop_index("uq_tags_workspace_name", table_name="tags")
    op.create_index("ix_tags_name", "tags", ["name"], unique=True)
    op.drop_index("ix_tags_workspace_id", table_name="tags")
    op.drop_constraint("fk_tags_workspace_id_workspaces", "tags", type_="foreignkey")
    op.drop_column("tags", "workspace_id")
