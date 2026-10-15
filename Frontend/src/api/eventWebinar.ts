import { request } from "@/api/client";

export type EventWebinar = {
  id: string;
  webinar_schedule: string;
  duration: string;
  campaign_owner_id: string | null;
  type: string;
  campaign_name: string;
  status: string | null;
  expected_revenue: number | null;
  budgeted_cost: number | null;
  actual_cost: number | null;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type EventWebinarPayload = {
  webinar_schedule: string;
  duration: string;
  campaign_owner_id?: string | null;
  type: string;
  campaign_name: string;
  status?: string | null;
  expected_revenue?: number | null;
  budgeted_cost?: number | null;
  actual_cost?: number | null;
  description?: string | null;
};

export type EventWebinarUpdatePayload = Partial<EventWebinarPayload>;

export type EventWebinarList = {
  items: EventWebinar[];
  total: number;
  page: number;
  per_page: number;
};

export type EventWebinarOwnerOption = {
  id: string;
  name: string;
};

export type EventWebinarOptions = {
  owners: EventWebinarOwnerOption[];
};

export type EventWebinarApiResponse = {
  events: EventWebinarList | EventWebinar;
  options?: EventWebinarOptions;
};

export type ListEventWebinarsParams = {
  eventId?: string;
  search?: string;
  page?: number;
  perPage?: number;
  includeOptions?: boolean;
};

export function listEventWebinars({
  eventId,
  search,
  page = 1,
  perPage = 10,
  includeOptions = false,
}: ListEventWebinarsParams = {}): Promise<EventWebinarApiResponse> {
  const query = new URLSearchParams();
  if (eventId) query.set("event_id", eventId);
  if (search?.trim()) query.set("search", search.trim());
  query.set("page", String(page));
  query.set("per_page", String(perPage));
  if (includeOptions) query.set("include_options", "true");
  return request<EventWebinarApiResponse>(`/event-webinars?${query.toString()}`);
}

export async function getEventWebinar(eventId: string): Promise<EventWebinar> {
  const response = await listEventWebinars({ eventId });
  if (!("id" in response.events)) {
    throw new Error("The server returned an invalid event webinar.");
  }
  return response.events;
}

export function createEventWebinar(
  payload: EventWebinarPayload,
): Promise<EventWebinar> {
  return request<EventWebinar>("/event-webinars", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEventWebinar(
  eventId: string,
  payload: EventWebinarUpdatePayload,
): Promise<EventWebinar> {
  return request<EventWebinar>(`/event-webinars/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteEventWebinar(eventId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/event-webinars/${eventId}`, {
    method: "DELETE",
  });
}

export function bulkDeleteEventWebinars(
  ids: string[],
): Promise<{ deleted_count: number }> {
  return request<{ deleted_count: number }>("/event-webinars/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
