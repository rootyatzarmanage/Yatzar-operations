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
  platform_name: string | null;
  mail_mailer: string | null;
  mail_host: string | null;
  mail_port: number | null;
  mail_username: string | null;
  mail_encryption: string | null;
  mail_from_address: string | null;
  mail_from_name: string | null;
  mail_status: "Enabled" | "Disabled";
  has_mail_password: boolean;
};

export type WorkspacePayload = Pick<
  Workspace,
  "name" | "description" | "status"
>;

export type WorkspacePlatformPayload = {
  platform_name: string;
  mail_mailer: "smtp";
  mail_host: string;
  mail_port: number;
  mail_username: string;
  mail_password: string;
  mail_encryption: "TLS" | "SSL" | "none";
  mail_from_address: string;
  mail_from_name: string;
  mail_status: "Enabled" | "Disabled";
};

export type WorkspaceCreatePayload = WorkspacePayload & WorkspacePlatformPayload;
export type WorkspaceUpdatePayload = Partial<WorkspacePayload & WorkspacePlatformPayload>;

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

export function getWorkspace(workspaceId: string): Promise<Workspace> {
  return request(`/workspaces/${encodeURIComponent(workspaceId)}`);
}

export function createWorkspace(payload: WorkspaceCreatePayload): Promise<Workspace> {
  return request("/workspaces", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorkspace(
  workspaceId: string,
  payload: WorkspaceUpdatePayload,
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
