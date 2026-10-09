export type ContactFields = {
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
};

const storageKey = "yatzar-operations.contacts.v1";

function isLocalContact(value: unknown): value is LocalContact {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    Object.keys(emptyFields).every(
      (field) => typeof record[field] === "string",
    )
  );
}

const emptyFields: ContactFields = {
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
  latitude: "",
  longitude: "",
  otherAddressLine1: "",
  otherAddressLine2: "",
  otherCity: "",
  otherState: "",
  otherCountry: "",
  otherPincode: "",
  otherLatitude: "",
  otherLongitude: "",
};

function readContacts(): LocalContact[] {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error(
      "Saved local contacts could not be read because the browser data is invalid.",
    );
  }

  if (!Array.isArray(parsed) || !parsed.every(isLocalContact)) {
    throw new Error(
      "Saved local contacts have an unexpected format. They were left unchanged.",
    );
  }
  return parsed;
}

function writeContacts(contacts: LocalContact[]): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(contacts));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error(
        "Browser storage is full. Remove some local contacts and try again.",
        { cause: error },
      );
    }
    throw new Error("Unable to save contacts in this browser.", {
      cause: error,
    });
  }
}

export function listLocalContacts(): LocalContact[] {
  return readContacts();
}

export function createLocalContact(fields: ContactFields): LocalContact {
  const now = new Date().toISOString();
  const contact: LocalContact = {
    ...fields,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  writeContacts([contact, ...readContacts()]);
  return contact;
}

export function updateLocalContact(
  contactId: string,
  fields: ContactFields,
): LocalContact {
  const contacts = readContacts();
  const existing = contacts.find((contact) => contact.id === contactId);
  if (!existing) throw new Error("This contact no longer exists.");

  const updated: LocalContact = {
    ...existing,
    ...fields,
    updatedAt: new Date().toISOString(),
  };
  writeContacts(
    contacts.map((contact) => (contact.id === contactId ? updated : contact)),
  );
  return updated;
}

export function deleteLocalContact(contactId: string): void {
  const contacts = readContacts();
  if (!contacts.some((contact) => contact.id === contactId)) {
    throw new Error("This contact no longer exists.");
  }
  writeContacts(contacts.filter((contact) => contact.id !== contactId));
}
