import { request } from "@/api/client";

export type MeetingParticipantType = "contact" | "lead" | "customer";

export type MeetingParticipant = {
  id: string;
  type: MeetingParticipantType;
};

export type MeetingApi = {
  id: string;
  title: string;
  venue: string | null;
  location: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string;
  participants: MeetingParticipant[];
  related_to: string | null;
  repeat_frequency: string;
  reminder: string;
  participants_reminder: string;
  reminder_type: string;
  description: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type MeetingList = {
  items: MeetingApi[];
  total: number;
  page: number;
  per_page: number;
};

export type MeetingParticipantPayload = MeetingParticipant;

export type MeetingPayload = {
  title: string;
  venue?: string | null;
  location?: string | null;
  all_day?: boolean;
  starts_at: string;
  ends_at: string;
  participants?: MeetingParticipantPayload[];
  related_to?: string | null;
  repeat_frequency?: string;
  reminder?: string;
  participants_reminder?: string;
  reminder_type?: string;
  description?: string | null;
};

export type MeetingUpdatePayload = Partial<MeetingPayload>;

export type ListMeetingsParams = {
  search?: string;
  page?: number;
  perPage?: number;
};

export function listMeetings({
  search,
  page = 1,
  perPage = 5,
}: ListMeetingsParams = {}): Promise<MeetingList> {
  const query = new URLSearchParams();

  if (search?.trim()) query.set("search", search.trim());
  query.set("page", String(page));
  query.set("per_page", String(perPage));

  return request<MeetingList>(`/meetings?${query.toString()}`);
}

export function getMeeting(meetingId: string): Promise<MeetingApi> {
  return request<MeetingApi>(
    `/meetings?meeting_id=${encodeURIComponent(meetingId)}`,
  );
}

export function createMeeting(payload: MeetingPayload): Promise<MeetingApi> {
  return request<MeetingApi>("/meetings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMeeting(
  meetingId: string,
  payload: MeetingUpdatePayload,
): Promise<MeetingApi> {
  return request<MeetingApi>(`/meetings/${meetingId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteMeeting(meetingId: string): Promise<null> {
  return request<null>(`/meetings/${meetingId}`, { method: "DELETE" });
}
