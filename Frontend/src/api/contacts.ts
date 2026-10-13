export type ContactFields = {
  contactOwner: string;
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

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type ContactPayload = {
  contact_owner: string | null;
  secondary_email: string | null;
  home_phone: string | null;
  mobile: string | null;
  date_of_birth: string | null;
  email_opt_out: boolean;
  description: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string;
  other_phone: string | null;
  department: string | null;
  lead_source: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: string | null;
  longitude: string | null;
  other_address_line1: string | null;
  other_address_line2: string | null;
  other_city: string | null;
  other_state: string | null;
  other_country: string | null;
  other_pincode: string | null;
  other_latitude: string | null;
  other_longitude: string | null;
};

export type Contact = ContactPayload & {
  id: string;
  created_at: string;
  updated_at: string;
  photo_url?: string | null;
};

const nullable = (value: string): string | null => value.trim() || null;

export function toContactPayload(fields: ContactFields): ContactPayload {
  return {
    contact_owner: nullable(fields.contactOwner),
    secondary_email: nullable(fields.secondaryEmail),
    home_phone: nullable(fields.homePhone),
    mobile: nullable(fields.mobile),
    date_of_birth: nullable(fields.dateOfBirth),
    email_opt_out: fields.emailOptOut,
    description: nullable(fields.description),
    first_name: fields.firstName.trim(),
    last_name: nullable(fields.lastName),
    email: fields.email.trim(),
    phone: fields.phone.trim(),
    other_phone: nullable(fields.otherPhone),
    department: nullable(fields.department),
    lead_source: fields.leadSource.trim(),
    address_line1: fields.addressLine1.trim(),
    address_line2: nullable(fields.addressLine2),
    city: fields.city.trim(),
    state: fields.state.trim(),
    country: fields.country.trim(),
    pincode: fields.pincode.trim(),
    latitude: nullable(fields.latitude),
    longitude: nullable(fields.longitude),
    other_address_line1: nullable(fields.otherAddressLine1),
    other_address_line2: nullable(fields.otherAddressLine2),
    other_city: nullable(fields.otherCity),
    other_state: nullable(fields.otherState),
    other_country: nullable(fields.otherCountry),
    other_pincode: nullable(fields.otherPincode),
    other_latitude: nullable(fields.otherLatitude),
    other_longitude: nullable(fields.otherLongitude),
  };
}

const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const apiPrefix = `${apiOrigin}/api/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiPrefix}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json()) as
    | ApiEnvelope<T>
    | { detail?: string | { msg: string }[]; message?: string };

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

export async function listContacts(): Promise<Contact[]> {
  const contacts: Contact[] = [];
  const pageSize = 100;
  let skip = 0;
  let page: Contact[];

  do {
    page = await request<Contact[]>(
      `/contacts?skip=${skip}&limit=${pageSize}`,
    );
    contacts.push(...page);
    skip += page.length;
  } while (page.length === pageSize);

  return contacts;
}

export function createContact(payload: ContactPayload): Promise<Contact> {
  return request<Contact>("/contacts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateContact(
  contactId: string,
  payload: ContactPayload,
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
  return request<Contact>(`/contacts/${contactId}/photo`, {
    method: "POST",
    body: formData,
  });
}