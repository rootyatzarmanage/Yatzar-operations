import type { ContactFields } from "@/api/contacts";
import {
  createLocalStore,
  type RecordValues,
  type StoredRecord,
} from "@/api/localStore";

export type LeadRecord = StoredRecord;

const store = createLocalStore("yatzar-operations.leads.v1", "leads");

export const leadDefaults: RecordValues = {
  leadOwner: "superadmin",
  company: "",
  firstName: "",
  lastName: "",
  title: "",
  email: "",
  phone: "",
  fax: "",
  mobile: "",
  website: "",
  leadSource: "",
  leadStatus: "Not contacted",
  industry: "",
  employees: "",
  annualRevenue: "",
  rating: "",
  skypeId: "",
  secondaryEmail: "",
  twitter: "",
  emailOptOut: false,
  country: "",
  flat: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  latitude: "",
  longitude: "",
  description: "",
  sourceContactId: "",
};

export const listLeads = () => store.list();
export const createLead = (values: RecordValues) => store.create(values);
export const updateLead = (id: string, values: RecordValues) =>
  store.update(id, values);
export const deleteLead = (id: string) => store.remove(id);

export function contactToLeadValues(contact: ContactFields): RecordValues {
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return {
    ...leadDefaults,
    leadOwner: contact.contactOwner || "superadmin",
    company: name,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    mobile: contact.mobile,
    leadSource: contact.leadSource,
    secondaryEmail: contact.secondaryEmail,
    emailOptOut: contact.emailOptOut,
    country: contact.country,
    flat: contact.addressLine1,
    street: contact.addressLine2,
    city: contact.city,
    state: contact.state,
    zip: contact.pincode,
    description: contact.description,
  };
}

/** Adds the contact to Leads (or refreshes the lead already made from it). */
export function addContactToLeads(
  contactId: string,
  contact: ContactFields,
): LeadRecord {
  const values = contactToLeadValues(contact);
  const existing = store
    .list()
    .find((lead) => lead.sourceContactId === contactId);
  // Keep the status the team already set on an existing lead.
  if (existing) values.leadStatus = existing.leadStatus;
  return store.upsertBySource(contactId, values);
}
