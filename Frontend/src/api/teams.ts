import { request } from "@/api/client";

export type Employee = {
  id: string;
  user_id: string;
  workspaces: Array<{ id: string; name: string }>;
  employee_code: string;
  employee_name: string;
  display_name: string | null;
  employee_type: string;
  date_of_birth: string;
  gender: string;
  blood_group: string | null;
  marital_status: string | null;
  photo: string | null;
  mobile_number: string;
  alternate_phone: string | null;
  email: string;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  address_line1: string;
  address_line2: string | null;
  country: string;
  state: string;
  district: string;
  pincode: string;
  permanent_address_line1: string | null;
  permanent_address_line2: string | null;
  permanent_country: string | null;
  permanent_state: string | null;
  permanent_district: string | null;
  permanent_pincode: string | null;
  date_of_joining: string;
  department: string;
  designation: string;
  reporting_manager: string | null;
  work_location: string;
  employment_status: string;
  aadhar_number: string | null;
  pan_number: string | null;
  uan_number: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  resume_file: string | null;
  id_proof_file: string | null;
  offer_letter_file: string | null;
  experience: string | null;
  skills: string | null;
  qualifications: string | null;
  remarks: string | null;
  username: string;
  login_email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EmployeePayload = Record<
  string,
  string | boolean | null | undefined
>;

export type EmployeeDraft = {
  id: string;
  data: Record<string, string>;
  updated_at: string;
};

export async function listEmployees(): Promise<Employee[]> {
  const employees: Employee[] = [];
  const pageSize = 100;
  let page = 1;
  let total = 0;
  do {
    const result = await request<{
      items: Employee[];
      total: number;
      page: number;
      per_page: number;
    }>(
      `/employees?page=${page}&per_page=${pageSize}`,
    );
    employees.push(...result.items);
    total = result.total;
    page += 1;
  } while (employees.length < total);
  return employees;
}

export function createEmployee(payload: EmployeePayload): Promise<Employee> {
  return request<Employee>("/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(
  employeeId: string,
  payload: Partial<EmployeePayload>,
): Promise<Employee> {
  return request<Employee>(`/employees/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteEmployee(
  employeeId: string,
): Promise<{ deleted_id: string }> {
  return request(`/employees/${employeeId}`, { method: "DELETE" });
}

export function listRoles(): Promise<{ id: string; name: string }[]> {
  return request("/roles");
}

export function listOptions(
  kind: string,
): Promise<{ id: string; value: string }[]> {
  return request(`/support/options/${encodeURIComponent(kind)}`);
}

export function listCountries(): Promise<string[]> {
  return request("/support/locations/countries");
}

export function listStates(country: string): Promise<string[]> {
  return request(`/support/locations/states?country=${encodeURIComponent(country)}`);
}

export function listDistricts(state: string): Promise<string[]> {
  return request(`/support/locations/districts?state=${encodeURIComponent(state)}`);
}

export function listEmployeeDrafts(): Promise<EmployeeDraft[]> {
  return request<{ items: Array<Record<string, unknown>> }>("/employees/drafts").then(
    ({ items }) =>
      items.map((item) => ({
        id: String(item.id),
        data: Object.fromEntries(
          Object.entries(item)
            .filter(
              ([key, value]) =>
                !["id", "updated_at", "created_at", "status"].includes(key) &&
                value !== null &&
                value !== undefined,
            )
            .map(([key, value]) => [key, String(value)]),
        ),
        updated_at: String(item.updated_at ?? ""),
      })),
  );
}

export function saveEmployeeDraft(
  data: Record<string, string>,
  draftId?: string,
): Promise<{ id: string; data: Record<string, string> }> {
  return request(draftId ? `/employees/${draftId}` : "/employees/draft", {
    method: draftId ? "PUT" : "POST",
    body: JSON.stringify(data),
  });
}

export function deleteEmployeeDraft(
  draftId: string,
): Promise<{ deleted_id: string }> {
  return request(`/employees/${draftId}`, { method: "DELETE" });
}
