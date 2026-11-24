"""Store draft and saved employees in the employees table.

Existing employees are saved records. The old employee_drafts table is retained
as a legacy archive so upgrading does not destroy previously entered data.
"""
from alembic import op
import sqlalchemy as sa


revision = "e2f4a6b8c0d1"
down_revision = ("acd0abdac0b3", "d4e5f6a7b8c9", "d9e8f7a6b5c4")
branch_labels = None
depends_on = None

DRAFT_COLUMNS = (
    "user_id", "employee_name", "employee_type", "date_of_birth", "gender",
    "mobile_number", "email", "address_line1", "country", "state", "district",
    "pincode", "date_of_joining", "department", "designation", "work_location",
    "employment_status",
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"]: column for column in inspector.get_columns("employees")}
    if "status" not in columns:
        # A temporary default classifies existing rows as saved, then new rows
        # default to draft, matching the ORM model.
        op.add_column("employees", sa.Column("status", sa.SmallInteger(), nullable=False, server_default="1"))
    with op.batch_alter_table("employees") as batch:
        batch.alter_column("status", existing_type=sa.SmallInteger(), nullable=False, server_default="0")
        for name in DRAFT_COLUMNS:
            column = columns[name]
            if not column["nullable"]:
                batch.alter_column(name, existing_type=column["type"], nullable=True)
        checks = {check["name"] for check in inspector.get_check_constraints("employees")}
        if "ck_employee_status" not in checks:
            batch.create_check_constraint("ck_employee_status", "status IN (0, 1)")
    employees = sa.table("employees", sa.column("status"), sa.column("user_id"))
    op.execute(employees.update().where(
        employees.c.user_id.is_not(None), employees.c.status == 0,
    ).values(status=1))
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("employees")}
    if "ix_employees_status" not in indexes:
        op.create_index("ix_employees_status", "employees", ["status"])


def downgrade() -> None:
    bind = op.get_bind()
    employees = sa.table("employees", sa.column("status"), *(sa.column(name) for name in DRAFT_COLUMNS))
    incomplete = sa.or_(employees.c.status == 0, *(employees.c[name].is_(None) for name in DRAFT_COLUMNS))
    if bind.execute(sa.select(sa.func.count()).select_from(employees).where(incomplete)).scalar_one():
        raise RuntimeError("Save or remove incomplete employee drafts before downgrading.")
    columns = {column["name"]: column for column in sa.inspect(bind).get_columns("employees")}
    op.drop_index("ix_employees_status", table_name="employees")
    with op.batch_alter_table("employees") as batch:
        batch.drop_constraint("ck_employee_status", type_="check")
        for name in DRAFT_COLUMNS:
            batch.alter_column(name, existing_type=columns[name]["type"], nullable=False)
        batch.drop_column("status")
