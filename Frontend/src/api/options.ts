import { request } from "@/api/client";

export type DropdownOption = { id: string; value: string };

export function listOptions(kind: "department" | "reporting_manager" | "lead_source") {
  return request<DropdownOption[]>(`/options/${kind}`);
}

export function createOption(
  kind: "department" | "reporting_manager" | "lead_source",
  value: string,
) {
  return request<DropdownOption>(`/options/${kind}`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export function updateOption(id: string, value: string) {
  return request<DropdownOption>(`/options/${id}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
}

export function deleteOption(id: string) {
  return request<{ deleted_id: string }>(`/options/${id}`, {
    method: "DELETE",
  });
}
