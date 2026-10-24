"""Calendar events and guests."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261022_calendar_events"
down_revision = "20261017_baseline"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade():
    op.create_table(
        "calendar_events",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("workspace_id", UUID, sa.ForeignKey("workspaces.id", ondelete="CASCADE")),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(30), nullable=False, server_default="Event"),
        sa.Column("location", sa.String(500)),
        sa.Column("description", sa.Text()),
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("repeat_frequency", sa.String(20), nullable=False, server_default="None"),
        sa.Column("reminder", sa.String(30), nullable=False, server_default="None"),
        sa.Column("guests_reminder", sa.String(30), nullable=False, server_default="None"),
        sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", UUID, sa.ForeignKey("users.id")),
        sa.Column("updated_by", UUID, sa.ForeignKey("users.id")),
        sa.Column("deleted_by", UUID, sa.ForeignKey("users.id")),
    )
    op.create_index("ix_calendar_events_workspace_id", "calendar_events", ["workspace_id"])
    op.create_index("ix_calendar_events_starts_at", "calendar_events", ["starts_at"])
    op.create_table(
        "calendar_event_guests",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("event_id", UUID, sa.ForeignKey("calendar_events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(255)),
        sa.Column("response", sa.String(20), nullable=False, server_default="needs_action"),
        sa.Column("is_organizer", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_removed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notified_sequence", sa.Integer(), nullable=False, server_default="-1"),
        sa.Column("cancel_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("responded_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("event_id", "email", name="uq_calendar_guest_event_email"),
    )
    op.create_index("ix_calendar_event_guests_event_id", "calendar_event_guests", ["event_id"])
    op.create_index("ix_calendar_event_guests_email", "calendar_event_guests", ["email"])


def downgrade():
    op.drop_table("calendar_event_guests")
    op.drop_table("calendar_events")