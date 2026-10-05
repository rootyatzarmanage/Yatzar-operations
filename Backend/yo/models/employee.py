import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from yo.core.database.base import Base, SoftDeleteMixin, TimestampMixin


class Employee(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    employee_code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    employee_name: Mapped[str] = mapped_column(String(150), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(150))
    employee_type: Mapped[str] = mapped_column(String(50), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    blood_group: Mapped[str | None] = mapped_column(String(10))
    marital_status: Mapped[str | None] = mapped_column(String(30))
    photo: Mapped[str | None] = mapped_column(String(500))
    mobile_number: Mapped[str] = mapped_column(String(30), nullable=False)
    alternate_phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150))
    emergency_contact_number: Mapped[str | None] = mapped_column(String(30))
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255))
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(20), nullable=False)
    permanent_address_line1: Mapped[str | None] = mapped_column(String(255))
    permanent_address_line2: Mapped[str | None] = mapped_column(String(255))
    permanent_country: Mapped[str | None] = mapped_column(String(100))
    permanent_state: Mapped[str | None] = mapped_column(String(100))
    permanent_district: Mapped[str | None] = mapped_column(String(100))
    permanent_pincode: Mapped[str | None] = mapped_column(String(20))
    date_of_joining: Mapped[date] = mapped_column(Date, nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    designation: Mapped[str] = mapped_column(String(100), nullable=False)
    reporting_manager: Mapped[str | None] = mapped_column(String(150))
    work_location: Mapped[str] = mapped_column(String(150), nullable=False)
    employment_status: Mapped[str] = mapped_column(String(50), nullable=False)
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

    user: Mapped["User"] = relationship(back_populates="employee")