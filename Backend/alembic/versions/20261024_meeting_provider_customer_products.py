"""Meeting provider/link and customer purchased products."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261024_meeting_products"
down_revision = "20261023_workspace_mail_config"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("meetings", sa.Column("meeting_provider", sa.String(50), nullable=True))
    op.add_column("meetings", sa.Column("meeting_link", sa.String(1000), nullable=True))
    op.add_column("contacts", sa.Column(
        "purchased_products", postgresql.JSONB(), nullable=False, server_default="[]"))


def downgrade():
    op.drop_column("contacts", "purchased_products")
    op.drop_column("meetings", "meeting_link")
    op.drop_column("meetings", "meeting_provider")
