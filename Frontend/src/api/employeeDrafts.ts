import { request } from "@/api/client";

export type EmployeeDraft = {
  id: string;
  data: Record<string, string>;
  updated_at: string;
};

export function listEmployeeDrafts(): Promise<EmployeeDraft[]> {
  return request<{ items: Array<Record<string, unknown>> }>("/employees/drafts").then(
    ({ items }) =>
      items.map((item) => ({
        id: String(item.id),
        data: Object.fromEntries(
          Object.entries(item).filter(
            ([key, value]) =>
              !["id", "updated_at", "created_at", "status"].includes(key) &&
              value !== null &&
              value !== undefined,
          ),
        ) as Record<string, string>,
        updated_at: String(item.updated_at ?? ""),
      })),
  );
}

export function saveEmployeeDraft(
  data: Record<string, string>,
  draftId?: string,
): Promise<{ id: string; data: Record<string, string> }> {
  return request<Record<string, unknown>>(
    draftId ? `/employees/${draftId}` : "/employees/draft",
    {
      method: draftId ? "PUT" : "POST",
      body: JSON.stringify(data),
    },
  ).then((item) => ({
    id: String(item.id),
    data,
  }));
}

export function deleteEmployeeDraft(
  draftId: string,
): Promise<{ deleted_id: string }> {
  return request(`/employees/${draftId}`, { method: "DELETE" });
}
