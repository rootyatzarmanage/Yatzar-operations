import { request } from "@/api/client";

export type PermissionValues = {
  create: boolean;
  view: boolean;
  update: boolean;
  delete: boolean;
};

export type RoleRecord = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: Array<PermissionValues & { menu: string }>;
};

export function listRoles() {
  return request<RoleRecord[]>("/roles");
}

export function createRole(payload: {
  name: string;
  permissions: Record<string, PermissionValues>;
}) {
  return request<RoleRecord>("/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRole(
  id: string,
  payload: { name: string; permissions: Record<string, PermissionValues> },
) {
  return request<RoleRecord>(`/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRole(id: string) {
  return request<{ deleted_id: string }>(`/roles/${id}`, {
    method: "DELETE",
  });
}
