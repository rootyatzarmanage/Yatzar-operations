from sqlalchemy import Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from yo.core.database.base import Base


class EmailNotificationSettings(Base):
    __tablename__ = "email_notification_settings"

    singleton: Mapped[bool] = mapped_column(Boolean, primary_key=True, default=True)
    to_emails: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    cc_emails: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
