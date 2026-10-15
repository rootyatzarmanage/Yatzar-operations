import { request } from "@/api/client";

export type Campaign = {
  id: string;
  campaign_subject: string;
  sender_name: string | null;
  sender_address: string;
  reply_to_address: string;
  campaign_owner_id: string | null;
  campaign_name: string;
  type: string;
  status: string | null;
  budgeted_cost: string | number | null;
  actual_cost: string | number | null;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type CampaignPayload = {
  campaign_subject: string;
  sender_name?: string | null;
  sender_address: string;
  reply_to_address: string;
  campaign_owner_id?: string | null;
  campaign_name: string;
  type: string;
  status?: string | null;
  budgeted_cost?: number | null;
  actual_cost?: number | null;
  description?: string | null;
};

export type CampaignUpdatePayload = Partial<CampaignPayload>;

export type CampaignList = {
  items: Campaign[];
  total: number;
  page: number;
  per_page: number;
};

export type CampaignOwnerOption = { id: string; name: string };

export type CampaignOptions = {
  owners: CampaignOwnerOption[];
  sender_addresses: string[];
  reply_to_addresses: string[];
};

export type CampaignsResponse = {
  campaigns: CampaignList | Campaign;
  options?: CampaignOptions;
};

export type ListCampaignsParams = {
  campaignId?: string;
  search?: string;
  page?: number;
  perPage?: number;
  includeOptions?: boolean;
};

export function listCampaigns({
  campaignId,
  search,
  page = 1,
  perPage = 5,
  includeOptions = false,
}: ListCampaignsParams = {}): Promise<CampaignsResponse> {
  const query = new URLSearchParams();
  if (campaignId) query.set("campaign_id", campaignId);
  if (search?.trim()) query.set("search", search.trim());
  query.set("page", String(page));
  query.set("per_page", String(perPage));
  if (includeOptions) query.set("include_options", "true");
  return request<CampaignsResponse>(`/campaigns?${query.toString()}`);
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  const response = await listCampaigns({ campaignId });
  if (!response.campaigns || !("id" in response.campaigns)) {
    throw new Error("The server returned an invalid campaign.");
  }
  return response.campaigns;
}

export function createCampaign(payload: CampaignPayload): Promise<Campaign> {
  return request<Campaign>("/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCampaign(
  campaignId: string,
  payload: CampaignUpdatePayload,
): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCampaign(campaignId: string): Promise<null> {
  return request<null>(`/campaigns/${campaignId}`, { method: "DELETE" });
}

export function bulkDeleteCampaigns(
  ids: string[],
): Promise<{ deleted_count: number }> {
  return request<{ deleted_count: number }>("/campaigns/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}