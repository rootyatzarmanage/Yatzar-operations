"""Persistent SMTP delivery history and scheduled marketing emails."""
from alembic import context, op
import sqlalchemy as sa

revision = "f1a2b3c4d5e6"
down_revision = "8d2f4a6c9b10"
branch_labels = None
depends_on = None


def upgrade():
    inspector = None if context.is_offline_mode() else sa.inspect(op.get_bind())
    columns = set() if inspector is None else {c["name"] for c in inspector.get_columns("email_marketing")}
    if "scheduled_at" not in columns:
        op.add_column("email_marketing", sa.Column("scheduled_at", sa.DateTime(timezone=True)))
        op.create_index("ix_email_marketing_scheduled_at", "email_marketing", ["scheduled_at"])
    if inspector is None or not inspector.has_table("mail_deliveries"):
        op.create_table(
            "mail_deliveries",
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("delivery_key", sa.String(64), nullable=False, unique=True),
            sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id")),
            sa.Column("source_type", sa.String(30), nullable=False),
            sa.Column("source_id", sa.Uuid(), nullable=False),
            sa.Column("recipient", sa.String(320), nullable=False),
            sa.Column("subject", sa.String(500), nullable=False),
            sa.Column("status", sa.String(20), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=False),
            sa.Column("last_error", sa.String(500)),
            sa.Column("next_attempt_at", sa.DateTime(timezone=True)),
            sa.Column("sent_at", sa.DateTime(timezone=True)),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_mail_deliveries_workspace_id", "mail_deliveries", ["workspace_id"])
        op.create_index("ix_mail_deliveries_source_id", "mail_deliveries", ["source_id"])


def downgrade():
    op.drop_table("mail_deliveries")
    op.drop_index("ix_email_marketing_scheduled_at", table_name="email_marketing")
    op.drop_column("email_marketing", "scheduled_at")
