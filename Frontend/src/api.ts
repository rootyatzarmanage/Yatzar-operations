const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type EmployeeRecord = {
  id: string;
  employee_code: string;
  employee_name: string;
  employee_type: string;
  department: string;
  work_location: string;
  employment_status: string;
  email: string;
  [key: string]: unknown;
};

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

export type DropdownOption = { id: string; value: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !body.success) {
    throw new Error(body.message || "The request could not be completed.");
  }
  return body.data;
}

export function listEmployees() {
  return request<EmployeeRecord[]>("/employees");
}

export function createEmployee(payload: Record<string, unknown>) {
  return request<EmployeeRecord>("/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(id: string, payload: Record<string, unknown>) {
  return request<EmployeeRecord>(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteEmployee(id: string) {
  return request<{ deleted_id: string }>(`/employees/${id}`, { method: "DELETE" });
}

export function listRoles() {
  return request<RoleRecord[]>("/roles");
}

export function createRole(payload: { name: string; permissions: Record<string, PermissionValues> }) {
  return request<RoleRecord>("/roles", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRole(id: string, payload: { name: string; permissions: Record<string, PermissionValues> }) {
  return request<RoleRecord>(`/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRole(id: string) {
  return request<{ deleted_id: string }>(`/roles/${id}`, { method: "DELETE" });
}

export function listCountries() {
  return request<string[]>("/locations/countries");
}

export function listStates(country: string) {
  return request<string[]>(`/locations/states?country=${encodeURIComponent(country)}`);
}

export function listDistricts(state: string) {
  return request<string[]>(`/locations/districts?state=${encodeURIComponent(state)}`);
}

export function listOptions(kind: "department" | "reporting_manager") {
  return request<DropdownOption[]>(`/options/${kind}`);
}

export function createOption(kind: "department" | "reporting_manager", value: string) {
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
  return request<{ deleted_id: string }>(`/options/${id}`, { method: "DELETE" });
}

export function saveEmployeeDraft(data: Record<string, string>) {
  return request<{ id: string; data: Record<string, string> }>("/employee-drafts", {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}
