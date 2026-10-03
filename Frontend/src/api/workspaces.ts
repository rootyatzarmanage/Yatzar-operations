type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type WorkspaceStatus = "Enabled" | "Disabled";

export type Workspace = {
  id: string;
  name: string;
  description: string;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
};

export type WorkspacePayload = Pick<
  Workspace,
  "name" | "description" | "status"
>;

const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const apiPrefix = `${apiOrigin}/api/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiPrefix}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json()) as
    ApiEnvelope<T> | { detail?: string | { msg: string }[]; message?: string };

  if (!response.ok) {
    const detail = "detail" in body ? body.detail : undefined;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join("; ")
          : "message" in body && body.message
            ? body.message
            : `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (!("success" in body) || !body.success) {
    throw new Error(
      "message" in body && body.message
        ? body.message
        : "The server returned an invalid response.",
    );
  }
  return body.data;
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

export function deleteWorkspace(
  workspaceId: string,
): Promise<{ deleted_id: string }> {
  return request(`/workspaces/${workspaceId}`, { method: "DELETE" });
}
