import { request } from "@/api/client";

export type Tag = {
  id: string;
  name: string;
  status: number; // 1 = active, 0 = inactive
  created_at: string;
  deleted_at: string | null;
};

export function listTags(includeInactive = false) {
  return request<Tag[]>(`/tags?include_inactive=${includeInactive}`);
}

export function createTag(name: string, status = 1) {
  return request<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify({ name, status }),
  });
}

export function updateTag(id: string, body: { name?: string; status?: number }) {
  return request<Tag>(`/tags/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteTag(id: string) {
  return request<null>(`/tags/${id}`, { method: "DELETE" });
}
