"""Add profile fallback fields for users without an employee record."""
from alembic import op
import sqlalchemy as sa

revision = "20261125_user_profile_fields"
down_revision = "20261029_merge_profile_heads"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("first_name", sa.String(length=150), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=150), nullable=True))
    op.add_column("users", sa.Column("mobile_number", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("country", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("district", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("pincode", sa.String(length=20), nullable=True))


def downgrade():
    op.drop_column("users", "pincode")
    op.drop_column("users", "district")
    op.drop_column("users", "state")
    op.drop_column("users", "country")
    op.drop_column("users", "mobile_number")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
