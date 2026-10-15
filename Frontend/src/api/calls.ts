import { request } from "@/api/client";

export type CallType = "Outbound" | "Inbound" | "Missed";
export type CallStatus = "Completed" | "Scheduled" | "Cancelled";

export type CallApi = {
  id: string;
  contact_id: string;
  subject: string;
  call_type: CallType;
  call_status: CallStatus;
  call_start_time: string;
  duration_minutes: number | null;
  duration_seconds: number | null;
  related_to: string | null;
  voice_recording: string | null;
  call_purpose: string | null;
  call_agenda: string | null;
  reminder: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CallList = {
  items: CallApi[];
  total: number;
  page: number;
  per_page: number;
};

export type CallPayload = {
  contact_id: string;
  subject: string;
  call_type: CallType;
  call_status?: CallStatus;
  call_start_time: string;
  duration_minutes?: number | null;
  duration_seconds?: number | null;
  related_to?: string | null;
  voice_recording?: string | null;
  call_purpose?: string | null;
  call_agenda?: string | null;
  reminder?: string | null;
};

export type CallUpdatePayload = Partial<CallPayload>;

export type ListCallsParams = {
  search?: string;
  page?: number;
  perPage?: number;
};

export function listCalls({
  search,
  page = 1,
  perPage = 5,
}: ListCallsParams = {}): Promise<CallList> {
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (search?.trim()) query.set("search", search.trim());
  return request<CallList>(`/calls?${query.toString()}`);
}

export function getCall(callId: string): Promise<CallApi> {
  return request<CallApi>(`/calls?call_id=${encodeURIComponent(callId)}`);
}

export function createCall(payload: CallPayload): Promise<CallApi> {
  return request<CallApi>("/calls", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCall(
  callId: string,
  payload: CallUpdatePayload,
): Promise<CallApi> {
  return request<CallApi>(`/calls/${callId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCall(callId: string): Promise<null> {
  return request<null>(`/calls/${callId}`, { method: "DELETE" });
}
