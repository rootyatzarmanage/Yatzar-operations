import { request } from "@/api/client";

export type EmployeeDraft = {
  id: string;
  data: Record<string, string>;
  updated_at: string;
};

export function listEmployeeDrafts(): Promise<EmployeeDraft[]> {
  return request<{ items: Array<Record<string, unknown>> }>("/employees/drafts").then(
    ({ items }) =>
      items.map((item) => ({
        id: String(item.id),
        data: Object.fromEntries(
          Object.entries(item).filter(
            ([key, value]) =>
              !["id", "updated_at", "created_at", "status"].includes(key) &&
              value !== null &&
              value !== undefined,
          ),
        ) as Record<string, string>,
        updated_at: String(item.updated_at ?? ""),
      })),
  );
}

export function saveEmployeeDraft(
  data: Record<string, string>,
  draftId?: string,
): Promise<{ id: string; data: Record<string, string> }> {
  // Drafts are created through POST /employees/draft. PUT /employees/{id}
  // is the saved-employee update route, not a draft update route.
  const draftFields = new Set([
    "employee_name",
    "display_name",
    "employee_type",
    "date_of_birth",
    "gender",
    "blood_group",
    "marital_status",
    "photo",
    "mobile_number",
    "alternate_phone",
    "email",
    "emergency_contact_name",
    "emergency_contact_number",
    "address_line1",
    "address_line2",
    "country",
    "state",
    "district",
    "pincode",
    "permanent_address_line1",
    "permanent_address_line2",
    "permanent_country",
    "permanent_state",
    "permanent_district",
    "permanent_pincode",
    "date_of_joining",
    "department",
    "designation",
    "reporting_manager",
    "work_location",
    "employment_status",
    "aadhar_number",
    "pan_number",
    "uan_number",
    "bank_name",
    "account_number",
    "ifsc_code",
    "resume_file",
    "id_proof_file",
    "offer_letter_file",
    "experience",
    "skills",
    "qualifications",
    "remarks",
  ]);
  const payload: Record<string, unknown> = Object.fromEntries(
    Object.entries(data).filter(([key]) => draftFields.has(key)),
  );
  if (data.workspace_ids !== undefined) {
    payload.workspace_ids = data.workspace_ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return request<Record<string, unknown>>("/employees/draft", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(async (item) => {
    // The backend has no draft-update route, so replace an existing draft only
    // after the new draft has been created successfully.
    if (draftId) await deleteEmployeeDraft(draftId).catch(() => {});
    return { id: String(item.id), data };
  });
}

export function deleteEmployeeDraft(
  draftId: string,
): Promise<{ deleted_id: string }> {
  return request(`/employees/${draftId}`, { method: "DELETE" });
}
