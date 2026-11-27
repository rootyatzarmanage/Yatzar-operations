"""Store super-admin email marketing completion recipients."""
from alembic import op
import sqlalchemy as sa


revision = "20261128_email_notifications"
down_revision = "20261127_workspace_tags"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "email_notification_settings",
        sa.Column("singleton", sa.Boolean(), primary_key=True, nullable=False),
        sa.Column("to_emails", sa.JSON(), nullable=False),
        sa.Column("cc_emails", sa.JSON(), nullable=False),
    )


def downgrade():
    op.drop_table("email_notification_settings")
