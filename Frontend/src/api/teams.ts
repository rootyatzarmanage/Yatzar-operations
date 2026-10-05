type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  validation: Record<string, unknown>;
};

export type Employee = {
  id: string;
  user_id: string;
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
  const envelope = (await response.json()) as
    | ApiEnvelope<T>
    | { detail?: string | { loc: string[]; msg: string }[]; message?: string };

  if (!response.ok) {
    const detail = "detail" in envelope ? envelope.detail : undefined;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join("; ")
          : "message" in envelope && envelope.message
            ? envelope.message
            : `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (!("success" in envelope) || !envelope.success) {
    throw new Error(
      "message" in envelope && envelope.message
        ? envelope.message
        : "The server returned an invalid response.",
    );
  }
  return envelope.data;
}

export async function listEmployees(): Promise<Employee[]> {
  const employees: Employee[] = [];
  const pageSize = 100;
  let skip = 0;
  let page: Employee[];
  do {
    page = await request<Employee[]>(
      `/employees?skip=${skip}&limit=${pageSize}`,
    );
    employees.push(...page);
    skip += page.length;
  } while (page.length === pageSize);
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
  return request(`/options/${encodeURIComponent(kind)}`);
}

export function listCountries(): Promise<string[]> {
  return request("/locations/countries");
}

export function listStates(country: string): Promise<string[]> {
  return request(`/locations/states?country=${encodeURIComponent(country)}`);
}

export function listDistricts(state: string): Promise<string[]> {
  return request(`/locations/districts?state=${encodeURIComponent(state)}`);
}

export function listEmployeeDrafts(): Promise<EmployeeDraft[]> {
  return request("/employee-drafts");
}

export function saveEmployeeDraft(
  data: Record<string, string>,
  draftId?: string,
): Promise<{ id: string; data: Record<string, string> }> {
  return request(draftId ? `/employee-drafts/${draftId}` : "/employee-drafts", {
    method: draftId ? "PUT" : "POST",
    body: JSON.stringify({ data }),
  });
}

export function deleteEmployeeDraft(
  draftId: string,
): Promise<{ deleted_id: string }> {
  return request(`/employee-drafts/${draftId}`, { method: "DELETE" });
}
