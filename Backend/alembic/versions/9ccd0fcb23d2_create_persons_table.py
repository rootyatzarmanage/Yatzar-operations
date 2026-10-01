"""replace the person demo with users and employees

Revision ID: 9ccd0fcb23d2
Revises: 
Create Date: 2026-09-26 20:30:44.922755

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ccd0fcb23d2'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("persons", if_exists=True)
    audit = [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_by", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", sa.Uuid(), nullable=True),
    ]
    op.create_table(
        "menus",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("path", sa.String(length=255)),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *audit,
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("name"), sa.UniqueConstraint("key"),
    )
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255)),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        *audit,
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("name"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *audit,
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("username"), sa.UniqueConstraint("email"),
    )
    op.create_table(
        "employees",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("employee_code", sa.String(length=30), nullable=False),
        sa.Column("employee_name", sa.String(length=150), nullable=False),
        sa.Column("display_name", sa.String(length=150)), sa.Column("employee_type", sa.String(length=50), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False), sa.Column("gender", sa.String(length=20), nullable=False),
        sa.Column("blood_group", sa.String(length=10)), sa.Column("marital_status", sa.String(length=30)), sa.Column("photo", sa.String(length=500)),
        sa.Column("mobile_number", sa.String(length=30), nullable=False), sa.Column("alternate_phone", sa.String(length=30)), sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("emergency_contact_name", sa.String(length=150)), sa.Column("emergency_contact_number", sa.String(length=30)),
        sa.Column("address_line1", sa.String(length=255), nullable=False), sa.Column("address_line2", sa.String(length=255)),
        sa.Column("country", sa.String(length=100), nullable=False), sa.Column("state", sa.String(length=100), nullable=False), sa.Column("district", sa.String(length=100), nullable=False), sa.Column("pincode", sa.String(length=20), nullable=False),
        sa.Column("permanent_address_line1", sa.String(length=255)), sa.Column("permanent_address_line2", sa.String(length=255)), sa.Column("permanent_country", sa.String(length=100)), sa.Column("permanent_state", sa.String(length=100)), sa.Column("permanent_district", sa.String(length=100)), sa.Column("permanent_pincode", sa.String(length=20)),
        sa.Column("date_of_joining", sa.Date(), nullable=False), sa.Column("department", sa.String(length=100), nullable=False), sa.Column("designation", sa.String(length=100), nullable=False), sa.Column("reporting_manager", sa.String(length=150)), sa.Column("work_location", sa.String(length=150), nullable=False), sa.Column("employment_status", sa.String(length=50), nullable=False),
        sa.Column("aadhar_number", sa.String(length=30)), sa.Column("pan_number", sa.String(length=20)), sa.Column("uan_number", sa.String(length=30)), sa.Column("bank_name", sa.String(length=150)), sa.Column("account_number", sa.String(length=50)), sa.Column("ifsc_code", sa.String(length=20)),
        sa.Column("resume_file", sa.String(length=500)), sa.Column("id_proof_file", sa.String(length=500)), sa.Column("offer_letter_file", sa.String(length=500)), sa.Column("experience", sa.String(length=100)), sa.Column("skills", sa.Text()), sa.Column("qualifications", sa.Text()), sa.Column("remarks", sa.Text()),
        *audit,
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("user_id"), sa.UniqueConstraint("employee_code"),
    )
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("menu_id", sa.Uuid(), nullable=False),
        sa.Column("can_create", sa.Boolean(), nullable=False),
        sa.Column("can_view", sa.Boolean(), nullable=False),
        sa.Column("can_update", sa.Boolean(), nullable=False),
        sa.Column("can_delete", sa.Boolean(), nullable=False),
        *audit,
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["menu_id"], ["menus.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_id", "menu_id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_employees_employee_code", "employees", ["employee_code"], unique=False)


def downgrade() -> None:
    op.drop_table("role_permissions")
    op.drop_table("employees")
    op.drop_table("users")
    op.drop_table("roles")
    op.drop_table("menus")
