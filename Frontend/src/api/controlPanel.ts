import { request } from "@/api/client";

export type EmailNotificationSettings = {
  to_emails: string[];
  cc_emails: string[];
};

export function getEmailNotificationSettings() {
  return request<EmailNotificationSettings>("/control-panel/email-notifications");
}

export function saveEmailNotificationSettings(settings: EmailNotificationSettings) {
  return request<EmailNotificationSettings>("/control-panel/email-notifications", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
