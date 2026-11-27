from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator


class EmailNotificationSettingsRequest(BaseModel):
    to_emails: list[EmailStr]
    cc_emails: list[EmailStr]

    model_config = ConfigDict(extra="forbid")

    @field_validator("to_emails", "cc_emails")
    @classmethod
    def normalize_unique_addresses(cls, values):
        normalized = [str(value).strip().lower() for value in values]
        if len(normalized) != len(set(normalized)):
            raise ValueError("Email addresses must be unique within each list.")
        return normalized

    @model_validator(mode="after")
    def prevent_to_cc_overlap(self):
        if set(self.to_emails) & set(self.cc_emails):
            raise ValueError("An email address cannot be both To and Cc.")
        return self
