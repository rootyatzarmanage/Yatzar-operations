import { request } from "@/api/client";

export type EmployeeDraft = {
  id: string;
  data: Record<string, string>;
  updated_at: string;
};

export function listEmployeeDrafts(): Promise<EmployeeDraft[]> {
  return request("/employee-drafts");
}

export function saveEmployeeDraft(
  data: Record<string, string>,
  draftId?: string,
): Promise<{ id: string; data: Record<string, string> }> {
  return request(draftId ? `/employee-drafts/${draftId}` : "/employee-drafts", {
    method: draftId ? "PUT" : "POST",
    body: JSON.stringify({ data }),
  });
}

export function deleteEmployeeDraft(
  draftId: string,
): Promise<{ deleted_id: string }> {
  return request(`/employee-drafts/${draftId}`, { method: "DELETE" });
}
