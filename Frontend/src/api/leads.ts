import {
  createContact,
  deleteContact,
  listContactStage,
  moveContact,
  updateContact,
  type Contact,
  type ContactPayload,
} from "@/api/contacts";
import type { RecordValues, StoredRecord } from "@/api/localStore";

export type LeadRecord = StoredRecord;

const text = (values: RecordValues, key: string) => String(values[key] ?? "").trim();
const nullable = (values: RecordValues, key: string) => text(values, key) || null;

function toPayload(values: RecordValues): ContactPayload {
  return {
    first_name: text(values, "firstName"),
    last_name: nullable(values, "lastName"),
    company: nullable(values, "company"),
    email: nullable(values, "email"),
    phone: nullable(values, "phone"),
    mobile: nullable(values, "mobile"),
    other_phone: nullable(values, "fax"),
    secondary_email: nullable(values, "secondaryEmail"),
    department: nullable(values, "title"),
    lead_source: nullable(values, "leadSource"),
    description: nullable(values, "description"),
    email_opt_out: Boolean(values.emailOptOut),
    mailing_country: nullable(values, "country"),
    mailing_building: nullable(values, "flat"),
    mailing_street: nullable(values, "street"),
    mailing_city: nullable(values, "city"),
    mailing_state: nullable(values, "state"),
    mailing_zip: nullable(values, "zip"),
    other_country: null,
    other_state: null,
    other_city: null,
    other_zip: null,
    other_building: null,
    other_street: null,
    home_phone: null,
    date_of_birth: null,
  };
}

function fromContact(contact: Contact): LeadRecord {
  return {
    id: contact.id,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at ?? contact.created_at,
    leadOwner: contact.owner_id ?? "",
    company: contact.company ?? "",
    firstName: contact.first_name ?? "",
    lastName: contact.last_name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    mobile: contact.mobile ?? "",
    fax: contact.other_phone ?? "",
    title: contact.department ?? "",
    leadSource: contact.lead_source ?? "",
    emailOptOut: contact.email_opt_out,
    country: contact.mailing_country ?? "",
    flat: contact.mailing_building ?? "",
    street: contact.mailing_street ?? "",
    city: contact.mailing_city ?? "",
    state: contact.mailing_state ?? "",
    zip: contact.mailing_zip ?? "",
    description: contact.description ?? "",
    leadStatus: "Not contacted",
  };
}

export const listLeads = async () =>
  (await listContactStage("lead")).map(fromContact);

export const createLead = async (values: RecordValues) =>
  fromContact(await moveContact((await createContact(toPayload(values))).id, "lead"));

export const updateLead = async (id: string, values: RecordValues) =>
  fromContact(await updateContact(id, toPayload(values)));

export const deleteLead = async (id: string) => {
  await deleteContact(id);
};

export const addContactToLeads = (contactId: string) =>
  moveContact(contactId, "lead");
