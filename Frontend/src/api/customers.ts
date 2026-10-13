import type { ContactFields } from "@/api/contacts";
import {
  createLocalStore,
  type RecordValues,
  type StoredRecord,
} from "@/api/localStore";

export type CustomerRecord = StoredRecord;

const store = createLocalStore("yatzar-operations.customers.v1", "customers");

export const customerDefaults: RecordValues = {
  customerId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  otherPhone: "",
  department: "",
  leadSource: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  otherAddressLine1: "",
  otherAddressLine2: "",
  otherCity: "",
  otherState: "",
  otherCountry: "",
  otherPincode: "",
  sourceContactId: "",
};

function nextCustomerId(): RecordValues {
  const highest = store.list().reduce((max, customer) => {
    const match = /^CUS-(\d+)$/.exec(String(customer.customerId));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return { customerId: `CUS-${String(highest + 1).padStart(4, "0")}` };
}

export const listCustomers = () => store.list();
export const createCustomer = (values: RecordValues) =>
  store.create({ ...values, ...nextCustomerId() });
export const updateCustomer = (id: string, values: RecordValues) =>
  store.update(id, values);
export const deleteCustomer = (id: string) => store.remove(id);

export function contactToCustomerValues(contact: ContactFields): RecordValues {
  return {
    ...customerDefaults,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    otherPhone: contact.otherPhone,
    department: contact.department,
    leadSource: contact.leadSource,
    addressLine1: contact.addressLine1,
    addressLine2: contact.addressLine2,
    city: contact.city,
    state: contact.state,
    country: contact.country,
    pincode: contact.pincode,
    otherAddressLine1: contact.otherAddressLine1,
    otherAddressLine2: contact.otherAddressLine2,
    otherCity: contact.otherCity,
    otherState: contact.otherState,
    otherCountry: contact.otherCountry,
    otherPincode: contact.otherPincode,
  };
}

/** Adds the contact to Customers (or refreshes the customer already made from it). */
export function addContactToCustomers(
  contactId: string,
  contact: ContactFields,
): CustomerRecord {
  return store.upsertBySource(
    contactId,
    contactToCustomerValues(contact),
    nextCustomerId,
  );
}
