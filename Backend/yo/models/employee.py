import uuid
from datetime import date

from sqlalchemy import (
    CheckConstraint, Column, Date, ForeignKey, SmallInteger, String, Table, Text, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from yo.core.database.base import Base, SoftDeleteMixin, TimestampMixin


employee_workspaces = Table(
    "employee_workspaces",
    Base.metadata,
    Column(
        "employee_id",
        Uuid(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "workspace_id",
        Uuid(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Employee(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employees"

    __table_args__ = (
        CheckConstraint(
            "status IN (0, 1)",
            name="ck_employee_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=True
    )
    employee_code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    status: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=0, server_default="0", index=True
    )
    employee_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(150))
    employee_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10))
    marital_status: Mapped[str | None] = mapped_column(String(30))
    photo: Mapped[str | None] = mapped_column(Text)
    mobile_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    alternate_phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150))
    emergency_contact_number: Mapped[str | None] = mapped_column(String(30))
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    permanent_address_line1: Mapped[str | None] = mapped_column(String(255))
    permanent_address_line2: Mapped[str | None] = mapped_column(String(255))
    permanent_country: Mapped[str | None] = mapped_column(String(100))
    permanent_state: Mapped[str | None] = mapped_column(String(100))
    permanent_district: Mapped[str | None] = mapped_column(String(100))
    permanent_pincode: Mapped[str | None] = mapped_column(String(20))
    date_of_joining: Mapped[date | None] = mapped_column(Date, nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reporting_manager: Mapped[str | None] = mapped_column(String(150))
    work_location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    employment_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    aadhar_number: Mapped[str | None] = mapped_column(String(30))
    pan_number: Mapped[str | None] = mapped_column(String(20))
    uan_number: Mapped[str | None] = mapped_column(String(30))
    bank_name: Mapped[str | None] = mapped_column(String(150))
    account_number: Mapped[str | None] = mapped_column(String(50))
    ifsc_code: Mapped[str | None] = mapped_column(String(20))
    resume_file: Mapped[str | None] = mapped_column(String(500))
    id_proof_file: Mapped[str | None] = mapped_column(String(500))
    offer_letter_file: Mapped[str | None] = mapped_column(String(500))
    experience: Mapped[str | None] = mapped_column(String(100))
    skills: Mapped[str | None] = mapped_column(Text)
    qualifications: Mapped[str | None] = mapped_column(Text)
    remarks: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User | None"] = relationship(back_populates="employee")
    workspaces: Mapped[list["Workspace"]] = relationship(
        secondary=employee_workspaces,
        back_populates="employees",
    )
