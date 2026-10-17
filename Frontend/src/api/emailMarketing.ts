import { request } from "@/api/client";

export type EmailMarketingCampaign = {
  id: string;
  workspace_id: string;
  campaign_name: string;
  platform: string;
  from_email: string;
  mail_type: "Test Email" | "Bulk Email" | string;
  to_email: string | null;
  tag_id: string | null;
  subject: string;
  content: string;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  sent_at: string | null;
  scheduled_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type EmailMarketingListItem = Pick<
  EmailMarketingCampaign,
  | "id"
  | "workspace_id"
  | "campaign_name"
  | "subject"
  | "status"
  | "sent_count"
  | "scheduled_at"
  | "open_count"
  | "click_count"
  | "updated_at"
>;

export type EmailMarketingList = {
  items: EmailMarketingListItem[];
  total: number;
  page: number;
  per_page: number;
};

export type EmailMarketingCreatePayload = {
  workspace_id: string;
  campaign_name: string;
  platform: string;
  from_email: string;
  mail_type: "Test Email" | "Bulk Email";
  to_email?: string | null;
  tag_id?: string | null;
  selection_mode?: "all" | "selected" | null;
  selected_user_ids?: string[];
  subject: string;
  content: string;
  scheduled_at?: string | null;
};

export type EmailMarketingRecipient = {
  id: string;
  user_id: string | null;
  email: string;
  is_enabled: boolean;
  sent: boolean;
  open_count: number;
  click_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  first_clicked_at: string | null;
  last_clicked_at: string | null;
};

export type EmailMarketingReport = {
  campaign_id: string;
  campaign_name: string;
  sent: number;
  opens: number;
  clicks: number;
  last_edited: string | null;
};

export async function listEmailMarketingCampaigns(
  search = "",
  page = 1,
  perPage = 100,
): Promise<EmailMarketingListItem[]> {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (search.trim()) query.set("search", search.trim());
  const result = await request<EmailMarketingList>(`/email-marketing?${query}`);
  if (page * perPage >= result.total) return result.items;
  return [
    ...result.items,
    ...(await listEmailMarketingCampaigns(search, page + 1, perPage)),
  ];
}

export function getEmailMarketingCampaign(campaignId: string) {
  return request<EmailMarketingCampaign>(
    `/email-marketing?campaign_id=${encodeURIComponent(campaignId)}`,
  );
}

export function createEmailMarketingCampaign(payload: EmailMarketingCreatePayload) {
  return request<EmailMarketingCampaign>("/email-marketing", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function scheduleEmailMarketingCampaign(campaignId: string, scheduledAt: string) {
  return request<EmailMarketingCampaign>(`/email-marketing/${campaignId}/schedule`, {
    method: "PATCH",
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
}

export function getEmailMarketingReport(campaignId: string) {
  return request<EmailMarketingReport>(`/email-marketing/${campaignId}/report`);
}

export async function getEmailMarketingRecipients(
  campaignId: string,
  page = 1,
  perPage = 100,
): Promise<EmailMarketingRecipient[]> {
  const result = await request<{
    items: EmailMarketingRecipient[];
    total: number;
    page: number;
    per_page: number;
  }>(`/email-marketing/${campaignId}/recipients?page=${page}&per_page=${perPage}`);
  if (page * perPage >= result.total) return result.items;
  return [
    ...result.items,
    ...(await getEmailMarketingRecipients(campaignId, page + 1, perPage)),
  ];
}

export function setEmailMarketingRecipientEnabled(recipientId: string, isEnabled: boolean) {
  return request<EmailMarketingRecipient>(`/email-marketing/recipients/${recipientId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_enabled: isEnabled }),
  });
}

export function replicateEmailMarketingCampaign(campaignId: string) {
  return request<EmailMarketingCampaign>(`/email-marketing/${campaignId}/replicate`, {
    method: "POST",
  });
}

export function deleteEmailMarketingCampaign(campaignId: string) {
  return request<{ deleted_id: string }>(`/email-marketing/${campaignId}`, {
    method: "DELETE",
  });
}
