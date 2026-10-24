import {
  createContact,
  deleteContact,
  listContactStage,
  moveContact,
  updateContact,
  type Contact,
  type ContactPayload,
  type PurchasedProduct,
} from "@/api/contacts";
import type { RecordValues, StoredRecord } from "@/storage/localStore";

export type CustomerRecord = StoredRecord;

const text = (values: RecordValues, key: string) => String(values[key] ?? "").trim();
const nullable = (values: RecordValues, key: string) => text(values, key) || null;

function purchasedProducts(values: RecordValues): PurchasedProduct[] {
  try {
    const parsed: unknown = JSON.parse(text(values, "purchasedProducts") || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): PurchasedProduct[] => {
      if (typeof item !== "object" || item === null) return [];
      const product = item as Record<string, unknown>;
      const name = typeof product.name === "string" ? product.name.trim() : "";
      if (!name) return [];
      const quantity = Number(product.quantity);
      return [{
        name,
        quantity: Number.isInteger(quantity) && quantity >= 1 && quantity <= 100000 ? quantity : 1,
        purchased_on: typeof product.purchased_on === "string" && product.purchased_on ? product.purchased_on : null,
      }];
    });
  } catch {
    return [];
  }
}

function toPayload(values: RecordValues): ContactPayload {
  return {
    first_name: text(values, "firstName"),
    last_name: nullable(values, "lastName"),
    company: null,
    email: nullable(values, "email"),
    phone: nullable(values, "phone"),
    other_phone: nullable(values, "otherPhone"),
    department: nullable(values, "department"),
    lead_source: nullable(values, "leadSource"),
    mailing_building: nullable(values, "addressLine1"),
    mailing_street: nullable(values, "addressLine2"),
    mailing_city: nullable(values, "city"),
    mailing_state: nullable(values, "state"),
    mailing_country: nullable(values, "country"),
    mailing_zip: nullable(values, "pincode"),
    other_building: nullable(values, "otherAddressLine1"),
    other_street: nullable(values, "otherAddressLine2"),
    other_city: nullable(values, "otherCity"),
    other_state: nullable(values, "otherState"),
    other_country: nullable(values, "otherCountry"),
    other_zip: nullable(values, "otherPincode"),
    secondary_email: null,
    home_phone: null,
    mobile: null,
    date_of_birth: null,
    description: null,
    tag_id: null,
    email_opt_out: false,
    purchased_products: purchasedProducts(values),
  };
}

function fromContact(contact: Contact): CustomerRecord {
  return {
    id: contact.id,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at ?? contact.created_at,
    customerId: contact.id,
    workspaceId: contact.workspace_id ?? "",
    firstName: contact.first_name ?? "",
    lastName: contact.last_name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    otherPhone: contact.other_phone ?? "",
    department: contact.department ?? "",
    leadSource: contact.lead_source ?? "",
    addressLine1: contact.mailing_building ?? "",
    addressLine2: contact.mailing_street ?? "",
    city: contact.mailing_city ?? "",
    state: contact.mailing_state ?? "",
    country: contact.mailing_country ?? "",
    pincode: contact.mailing_zip ?? "",
    otherAddressLine1: contact.other_building ?? "",
    otherAddressLine2: contact.other_street ?? "",
    otherCity: contact.other_city ?? "",
    otherState: contact.other_state ?? "",
    otherCountry: contact.other_country ?? "",
    otherPincode: contact.other_zip ?? "",
    purchasedProducts: JSON.stringify(contact.purchased_products ?? []),
  };
}

export const listCustomers = async () =>
  (await listContactStage("customer")).map(fromContact);

export const createCustomer = async (values: RecordValues) =>
  fromContact(await moveContact((await createContact(toPayload(values))).id, "customer"));

export const updateCustomer = async (id: string, values: RecordValues) =>
  fromContact(await updateContact(id, toPayload(values)));

export const deleteCustomer = async (id: string) => {
  await deleteContact(id);
};

export const addContactToCustomers = (contactId: string) =>
  moveContact(contactId, "customer");
