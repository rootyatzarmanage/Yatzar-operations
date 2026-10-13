import { API_BASE, request } from "@/api/client";

export type ContactFields = {
  contactOwner: string;
  workspace: string;
  secondaryEmail: string;
  homePhone: string;
  mobile: string;
  dateOfBirth: string;
  emailOptOut: boolean;
  description: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  otherPhone: string;
  department: string;
  leadSource: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: string;
  longitude: string;
  otherAddressLine1: string;
  otherAddressLine2: string;
  otherCity: string;
  otherState: string;
  otherCountry: string;
  otherPincode: string;
  otherLatitude: string;
  otherLongitude: string;
};

export type LocalContact = ContactFields & {
  id: string;
  createdAt: string;
  updatedAt: string;
  photoUrl: string;
};

export type ContactPayload = {
  workspace_id?: string | null;
  secondary_email: string | null;
  home_phone: string | null;
  mobile: string | null;
  date_of_birth: string | null;
  email_opt_out: boolean;
  description: string | null;
  first_name: string;
  last_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  other_phone: string | null;
  department: string | null;
  lead_source: string | null;
  mailing_country: string | null;
  mailing_state: string | null;
  mailing_city: string | null;
  mailing_zip: string | null;
  mailing_building: string | null;
  mailing_street: string | null;
  other_country: string | null;
  other_state: string | null;
  other_city: string | null;
  other_zip: string | null;
  other_building: string | null;
  other_street: string | null;
};

export type Contact = Omit<ContactPayload, "first_name" | "email" | "phone"> & {
  id: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  workspace_id: string | null;
  owner_id: string | null;
  photo: string | null;
  stage: "contact" | "lead" | "customer";
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ContactStage = Contact["stage"];
export type ContactList = {
  items: Contact[];
  total: number;
  page: number;
  per_page: number;
};

const nullable = (value: string): string | null => value.trim() || null;

export function toContactPayload(fields: ContactFields): ContactPayload {
  return {
    secondary_email: nullable(fields.secondaryEmail),
    home_phone: nullable(fields.homePhone),
    mobile: nullable(fields.mobile),
    date_of_birth: nullable(fields.dateOfBirth),
    email_opt_out: fields.emailOptOut,
    description: nullable(fields.description),
    first_name: fields.firstName.trim(),
    last_name: nullable(fields.lastName),
    company: null,
    email: fields.email.trim(),
    phone: fields.phone.trim(),
    other_phone: nullable(fields.otherPhone),
    department: nullable(fields.department),
    lead_source: nullable(fields.leadSource),
    mailing_country: nullable(fields.country),
    mailing_state: nullable(fields.state),
    mailing_city: nullable(fields.city),
    mailing_zip: nullable(fields.pincode),
    mailing_building: nullable(fields.addressLine1),
    mailing_street: nullable(fields.addressLine2),
    other_country: nullable(fields.otherCountry),
    other_state: nullable(fields.otherState),
    other_city: nullable(fields.otherCity),
    other_zip: nullable(fields.otherPincode),
    other_building: nullable(fields.otherAddressLine1),
    other_street: nullable(fields.otherAddressLine2),
    workspace_id: fields.workspace.trim() || null,
  };
}

export function getContactPhotoUrl(photo: string | null): string {
  if (!photo) return "";
  if (/^https?:\/\//i.test(photo)) return photo;

  const backendOrigin = API_BASE.replace(/\/api\/v1\/?$/, "");
  return `${backendOrigin}/${photo.replace(/^\/+/, "")}`;
}

export async function listContacts(): Promise<Contact[]> {
  return listContactStage("contact");
}

export async function listContactStage(
  stage: ContactStage,
  search = "",
  page = 1,
  perPage = 100,
): Promise<Contact[]> {
  const query = new URLSearchParams({
    stage,
    page: String(page),
    per_page: String(perPage),
  });
  if (search.trim()) query.set("search", search.trim());
  const result = await request<ContactList>(`/contacts?${query}`);
  if (page * perPage < result.total) {
    return [
      ...result.items,
      ...(await listContactStage(stage, search, page + 1, perPage)),
    ];
  }
  return result.items;
}

export function createContact(payload: ContactPayload): Promise<Contact> {
  return request<Contact>("/contacts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateContact(
  contactId: string,
  payload: Partial<ContactPayload>,
): Promise<Contact> {
  return request<Contact>(`/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteContact(
  contactId: string,
): Promise<{ deleted_id: string }> {
  return request<{ deleted_id: string }>(`/contacts/${contactId}`, {
    method: "DELETE",
  });
}

export function uploadContactPhoto(
  contactId: string,
  file: File,
): Promise<Contact> {
  const formData = new FormData();
  formData.append("file", file);
  return request<Contact>(`/contacts/${contactId}/image`, {
    method: "POST",
    body: formData,
  });
}

export function moveContact(
  contactId: string,
  stage: Exclude<ContactStage, "contact">,
): Promise<Contact> {
  return request<Contact>(`/contacts/${contactId}/move-to-${stage}`, {
    method: "POST",
  });
}

export function bulkDeleteContacts(
  ids: string[],
): Promise<{ deleted: number }> {
  return request<{ deleted: number }>("/contacts/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
