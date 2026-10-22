import sqlalchemy as sa
from alembic import op

revision = "20261023_workspace_mail_config"
down_revision = "20261022_calendar_events"
branch_labels = None
depends_on = None

COLUMNS = [
    ("platform_name", sa.String(150)),
    ("mail_mailer", sa.String(20)),
    ("mail_host", sa.String(255)),
    ("mail_port", sa.Integer()),
    ("mail_username", sa.String(320)),
    ("mail_password", sa.Text()),
    ("mail_encryption", sa.String(20)),
    ("mail_from_address", sa.String(320)),
    ("mail_from_name", sa.String(150)),
]


def upgrade():
    for name, type_ in COLUMNS:
        op.add_column("workspaces", sa.Column(name, type_, nullable=True))
    op.add_column("workspaces", sa.Column(
        "mail_status", sa.String(20), nullable=False, server_default="Enabled"))


def downgrade():
    op.drop_column("workspaces", "mail_status")
    for name, _ in reversed(COLUMNS):
        op.drop_column("workspaces", name)
