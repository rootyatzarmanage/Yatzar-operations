import { API_BASE, request } from "@/api/client";

export type WorkspaceStatus = "Enabled" | "Disabled";

export type Workspace = {
  id: string;
  name: string;
  description: string;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
  image: string | null;
};

export type WorkspacePayload = Pick<
  Workspace,
  "name" | "description" | "status"
>;

export function getWorkspaceImageUrl(image: string | null | undefined): string {
  if (!image) return "";
  if (/^https?:\/\//i.test(image) || image.startsWith("data:")) return image;
  const backendOrigin = API_BASE.startsWith("/")
    ? ""
    : API_BASE.replace(/\/api\/v1\/?$/, "");
  return `${backendOrigin}/${image.replace(/^\/+/, "")}`;
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const workspaces: Workspace[] = [];
  const pageSize = 100;
  let skip = 0;
  let page: Workspace[];
  do {
    page = await request<Workspace[]>(
      `/workspaces?skip=${skip}&limit=${pageSize}`,
    );
    workspaces.push(...page);
    skip += page.length;
  } while (page.length === pageSize);
  return workspaces;
}

export function createWorkspace(payload: WorkspacePayload): Promise<Workspace> {
  return request("/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorkspace(
  workspaceId: string,
  payload: WorkspacePayload,
): Promise<Workspace> {
  return request(`/workspaces/${workspaceId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function uploadWorkspaceImage(
  workspaceId: string,
  file: File,
  replace = false,
): Promise<{ workspace_id: string; image: string | null }> {
  const formData = new FormData();
  formData.append("file", file);
  return request<{ workspace_id: string; image: string | null }>(`/workspaces/${workspaceId}/image`, {
    method: replace ? "PUT" : "POST",
    body: formData,
  });
}

export function deleteWorkspaceImage(workspaceId: string): Promise<null> {
  return request<null>(`/workspaces/${workspaceId}/image`, { method: "DELETE" });
}

export function deleteWorkspace(
  workspaceId: string,
): Promise<{ deleted_id: string }> {
  return request(`/workspaces/${workspaceId}`, { method: "DELETE" });
}

export async function deleteWorkspaces(
  workspaceIds: string[],
): Promise<void> {
  await Promise.all(
    workspaceIds.map((id) => deleteWorkspace(id)),
  );
}
