import { request } from "@/api/client";

export type TaskApi = {
  id: string;
  subject: string;
  due_date: string | null;
  task_owner_id: string;
  contact_selection: ContactSelectionApi;
  account: string | null;
  status: string;
  priority: string;
  reminder_enabled: boolean;
  reminder_at: string | null;
  reminder_type: string | null;
  repeat_enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactSelectionApi = {
  selection_type: "name" | "tag";
  tag_id: string | null;
  contact_ids: string[];
};

export type TaskPayload = {
  subject: string;
  due_date?: string | null;
  contact_selection?: ContactSelectionApi;
  account?: string | null;
  status?: string;
  priority?: string;
  reminder_enabled?: boolean;
  reminder_at?: string | null;
  reminder_type?: string | null;
  repeat_enabled?: boolean;
  description?: string | null;
};

export function listTasks(search = ""): Promise<TaskApi[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return request<TaskApi[]>(`/tasks${query}`);
}

export function createTask(payload: TaskPayload): Promise<TaskApi> {
  return request<TaskApi>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTask(
  taskId: string,
  payload: Partial<TaskPayload>,
): Promise<TaskApi> {
  return request<TaskApi>(`/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTask(taskId: string): Promise<null> {
  return request<null>(`/tasks/${taskId}`, { method: "DELETE" });
}
