import { request } from "@/api/client";

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

type EmployeeListResponse = {
  items: EmployeeRecord[];
  total: number;
  page: number;
  per_page: number;
};

export async function listEmployees(): Promise<EmployeeRecord[]> {
  const records: EmployeeRecord[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await request<EmployeeListResponse>(
      `/employees?page=${page}&per_page=${perPage}`,
    );
    records.push(...response.items);
    if (records.length >= response.total || response.items.length === 0) {
      return records;
    }
    page += 1;
  }
}

export function getEmployee(id: string) {
  return request<EmployeeRecord>(`/employees/${id}`);
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
  return request<{ deleted_id: string }>(`/employees/${id}`, {
    method: "DELETE",
  });
}
