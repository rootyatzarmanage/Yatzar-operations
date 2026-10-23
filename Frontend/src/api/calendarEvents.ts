import { request } from "@/api/client";

export type CalendarResponse = "needs_action" | "accepted" | "declined" | "maybe";

export type CalendarGuest = {
  id: string;
  email: string;
  name: string | null;
  response: CalendarResponse;
  is_organizer: boolean;
};

export type CalendarEventApi = {
  id: string;
  workspace_id: string | null;
  title: string;
  event_type: string;
  location: string | null;
  description: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string;
  repeat_frequency: string;
  reminder: string;
  guests_reminder: string;
  guests: CalendarGuest[];
  created_by: string | null;
  is_organizer: boolean;
  my_response: CalendarResponse | null;
  my_reminder_minutes: number | null;
};

export type CalendarEventPayload = {
  title: string;
  event_type?: string;
  location?: string | null;
  description?: string | null;
  all_day?: boolean;
  starts_at: string;
  ends_at: string;
  repeat_frequency?: string;
  reminder?: string;
  guests_reminder?: string;
  guests?: { email: string; name?: string | null }[];
  send_invites?: boolean;
};

export function listCalendarEvents(startDate: string, endDate: string): Promise<CalendarEventApi[]> {
  const query = new URLSearchParams({ start: `${startDate}T00:00:00`, end: `${endDate}T23:59:59` });
  return request<CalendarEventApi[]>(`/calendar-events?${query.toString()}`);
}

export function createCalendarEvent(payload: CalendarEventPayload): Promise<CalendarEventApi> {
  return request<CalendarEventApi>("/calendar-events", { method: "POST", body: JSON.stringify(payload) });
}

export function updateCalendarEvent(id: string, payload: Partial<CalendarEventPayload>): Promise<CalendarEventApi> {
  return request<CalendarEventApi>(`/calendar-events/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteCalendarEvent(id: string): Promise<null> {
  return request<null>(`/calendar-events/${id}`, { method: "DELETE" });
}

export function respondCalendarEvent(id: string, response: "accepted" | "declined" | "maybe"): Promise<CalendarEventApi> {
  return request<CalendarEventApi>(`/calendar-events/${id}/respond`, { method: "POST", body: JSON.stringify({ response }) });
}

export async function downloadCalendarIcs(id: string): Promise<void> {
  const file = await request<{ filename: string; content: string }>(`/calendar-events/${id}/ics`);
  const url = URL.createObjectURL(new Blob([file.content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}