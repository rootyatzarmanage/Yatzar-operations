import { listOptions } from "@/api/teams";
import {
  createContact,
  deleteContact,
  getContactPhotoUrl,
  listContacts,
  toContactPayload,
  uploadContactPhoto,
  updateContact,
  type ContactFields,
  type Contact,
  type LocalContact,
} from "@/api/contacts";
import { addContactToCustomers } from "@/api/customers";
import { addContactToLeads } from "@/api/leads";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";

const emptyForm: ContactFields = {
  contactOwner: "",
  secondaryEmail: "",
  homePhone: "",
  mobile: "",
  dateOfBirth: "",
  emailOptOut: false,
  description: "",
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

type MoveTarget = "leads" | "customers";
type FieldKey = keyof ContactFields;
type StringFieldKey = {
  [Key in keyof ContactFields]-?: ContactFields[Key] extends string
    ? Key
    : never;
}[keyof ContactFields];
type FieldErrors = Partial<Record<FieldKey, string>>;
const maxContactPhotoSize = 5 * 1024 * 1024;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 transition outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800";
const tableHeaderClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";
const defaultLeadSources = [
  "Website",
  "Referral",
  "Social media",
  "Cold call",
  "Event",
];

function contactName(contact: LocalContact): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

function fromApiContact(contact: Contact): LocalContact {
  return {
    contactOwner: contact.owner_id ?? "",
    secondaryEmail: contact.secondary_email ?? "",
    homePhone: contact.home_phone ?? "",
    mobile: contact.mobile ?? "",
    dateOfBirth: contact.date_of_birth ?? "",
    emailOptOut: contact.email_opt_out,
    description: contact.description ?? "",
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
    latitude: "",
    longitude: "",
    otherAddressLine1: contact.other_building ?? "",
    otherAddressLine2: contact.other_street ?? "",
    otherCity: contact.other_city ?? "",
    otherState: contact.other_state ?? "",
    otherCountry: contact.other_country ?? "",
    otherPincode: contact.other_zip ?? "",
    id: contact.id,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at ?? contact.created_at,
    otherLatitude: "",
    otherLongitude: "",
    photoUrl: getContactPhotoUrl(contact.photo),
  };
}

function validateCoordinates(
  value: string,
  min: number,
  max: number,
  label: string,
): string | undefined {
  if (!value.trim()) return `${label} is required.`;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) {
    return `Enter a valid ${label.toLowerCase()} from ${min} to ${max}.`;
  }
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return `Enter a valid ${label.toLowerCase()} from ${min} to ${max}.`;
  }
  return undefined;
}

export default function Contacts() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>(defaultLeadSources);
  const [, setLeadSourcesLoading] = useState(true);
  const [, setLeadSourcesError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [formValues, setFormValues] = useState<ContactFields>(emptyForm);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moveRequest, setMoveRequest] = useState<{
    id: string;
    to: MoveTarget;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5);

  useEffect(() => {
    let active = true;
    void listContacts()
      .then((items) => {
        if (active) setContacts(items.map(fromApiContact));
      })
      .catch((error: unknown) => {
        if (active) {
          setPageError(
            error instanceof Error ? error.message : "Unable to load contacts.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void listOptions("lead_source")
      .then((options) => {
        if (active) {
          setLeadSources([
            ...new Set([
              ...defaultLeadSources,
              ...options.map((option) => option.value.trim()),
            ]),
          ].filter(Boolean));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLeadSourcesError(
            error instanceof Error
              ? error.message
              : "Unable to load configured lead sources.",
          );
        }
      })
      .finally(() => {
        if (active) setLeadSourcesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredContacts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      [
        contactName(contact),
        contact.email,
        contact.phone,
        contact.otherPhone,
        contact.department,
        contact.leadSource,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [contacts, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredContacts.length / entriesPerPage),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedContacts = filteredContacts.slice(
    startIndex,
    startIndex + entriesPerPage,
  );
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  );
  const allPageSelected =
    paginatedContacts.length > 0 &&
    paginatedContacts.every((contact) => selectedIds.includes(contact.id));
  const selectedCount = selectedIds.filter((id) =>
    contacts.some((contact) => contact.id === id),
  ).length;
  const contactToDelete =
    contacts.find((contact) => contact.id === deleteId) ?? null;

  const clearMessages = () => {
    setPageError("");
    setNotice("");
  };

  const openAddForm = () => {
    clearMessages();
    setEditingId(null);
    setViewing(false);
    setFormValues({ ...emptyForm });
    setSelectedPhoto(null);
    setPhotoPreview("");
    setFormErrors({});
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (contact: LocalContact) => {
    clearMessages();
    setEditingId(contact.id);
    setViewing(false);
    setFormValues({
      contactOwner: contact.contactOwner,
      secondaryEmail: contact.secondaryEmail,
      homePhone: contact.homePhone,
      mobile: contact.mobile,
      dateOfBirth: contact.dateOfBirth,
      emailOptOut: contact.emailOptOut,
      description: contact.description,
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
          latitude: contact.latitude ?? "",
          longitude: contact.longitude ?? "",
      otherAddressLine1: contact.otherAddressLine1,
      otherAddressLine2: contact.otherAddressLine2,
      otherCity: contact.otherCity,
      otherState: contact.otherState,
      otherCountry: contact.otherCountry,
      otherPincode: contact.otherPincode,
      otherLatitude: contact.otherLatitude ?? "",
      otherLongitude: contact.otherLongitude ?? "",
    });
    setSelectedPhoto(null);
    setPhotoPreview(contact.photoUrl);
    setFormErrors({});
    setFormError("");
    setShowForm(true);
  };

  const openViewForm = (contact: LocalContact) => {
    openEditForm(contact);
    setViewing(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setViewing(false);
    setFormValues({ ...emptyForm });
    setSelectedPhoto(null);
    setPhotoPreview("");
    setFormErrors({});
    setFormError("");
  };

  const updateField = (field: FieldKey, value: string | boolean) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file.");
      return;
    }
    if (file.size > maxContactPhotoSize) {
      setFormError("Contact photos must be 5 MB or smaller.");
      return;
    }
    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setFormError("");
  };

  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};
    const requiredFields: [FieldKey, string][] = [
      ["firstName", "First name"],
      ["email", "Email"],
      ["phone", "Phone"],
    ];
    for (const [field, label] of requiredFields) {
      if (
        typeof formValues[field] === "string" &&
        !formValues[field].trim()
      ) {
        errors[field] = `${label} is required.`;
      }
    }

    if (
      formValues.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())
    ) {
      errors.email = "Enter a valid email address.";
    }
    if (formValues.otherLatitude.trim()) {
      errors.otherLatitude = validateCoordinates(formValues.otherLatitude, -90, 90, "Other latitude");
    }
    if (formValues.otherLongitude.trim()) {
      errors.otherLongitude = validateCoordinates(formValues.otherLongitude, -180, 180, "Other longitude");
    }
    if (formValues.latitude.trim()) {
      errors.latitude = validateCoordinates(formValues.latitude, -90, 90, "Latitude");
    }
    if (formValues.longitude.trim()) {
      errors.longitude = validateCoordinates(formValues.longitude, -180, 180, "Longitude");
    }

    if (
      formValues.leadSource &&
      !leadSources.includes(formValues.leadSource) &&
      !(
        editingId &&
        contacts.find((contact) => contact.id === editingId)?.leadSource ===
          formValues.leadSource
      )
    ) {
      errors.leadSource =
        "Choose a lead source configured by your administrator.";
    }
    return errors;
  };

  /** Validates and saves the form as a contact. Returns the saved contact, or null. */
  const saveContact = async (): Promise<LocalContact | null> => {
    const errors = validateForm();
    setFormErrors(errors);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return null;

    try {
      let saved: LocalContact;
      if (editingId) {
        const response = await updateContact(
          editingId,
          toContactPayload(formValues),
        );
        saved = fromApiContact(response);
        setContacts((current) =>
          current.map((contact) => (contact.id === saved.id ? saved : contact)),
        );
        setNotice("Contact updated.");
      } else {
        const response = await createContact(toContactPayload(formValues));
        saved = fromApiContact(response);
        setContacts((current) => [saved, ...current]);
        setPage(1);
        // From here on this form edits the contact that was just created.
        setEditingId(saved.id);
        setNotice("Contact saved.");
      }
      if (selectedPhoto) {
        const response = await uploadContactPhoto(saved.id, selectedPhoto);
        const uploaded = fromApiContact(response);
        saved = uploaded;
        setContacts((current) =>
          current.map((contact) =>
            contact.id === uploaded.id ? uploaded : contact,
          ),
        );
      }
      setPageError("");
      return saved;
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save this contact.",
      );
      return null;
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (await saveContact()) closeForm();
    } finally {
      setIsSaving(false);
    }
  };

  /** Form buttons: save the contact and also add it to Leads / Customers. */
  const handleSaveAndAdd = async (to: MoveTarget) => {
    setIsSaving(true);
    try {
      const saved = await saveContact();
      if (!saved) return;
      try {
        if (to === "leads") await addContactToLeads(saved.id);
        else await addContactToCustomers(saved.id);
        setContacts((current) =>
          current.filter((contact) => contact.id !== saved.id),
        );
        setSelectedIds((current) =>
          current.filter((contactId) => contactId !== saved.id),
        );
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : `Unable to add this contact to ${to}.`,
        );
        return;
      }
      setNotice(
        `${contactName(saved)} saved and added to ${to === "leads" ? "Leads" : "Customers"}.`,
      );
      closeForm();
    } finally {
      setIsSaving(false);
    }
  };

  /** Row action: move the contact to Leads / Customers (removed from Contacts). */
  const confirmMove = async () => {
    if (!moveRequest) return;
    const contact = contacts.find((item) => item.id === moveRequest.id);
    if (!contact) {
      setMoveRequest(null);
      return;
    }
    setIsSaving(true);
    try {
      if (moveRequest.to === "leads") await addContactToLeads(contact.id);
      else await addContactToCustomers(contact.id);
      setContacts((current) => current.filter((item) => item.id !== contact.id));
      setSelectedIds((current) => current.filter((id) => id !== contact.id));
      setPageError("");
      setNotice(
        `${contactName(contact)} moved to ${moveRequest.to === "leads" ? "Leads" : "Customers"}.`,
      );
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Unable to move this contact.",
      );
    } finally {
      setIsSaving(false);
      setMoveRequest(null);
    }
  };

  const toggleSelected = (contactId: string) => {
    setSelectedIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((current) =>
        current.filter(
          (selectedId) =>
            !paginatedContacts.some((contact) => contact.id === selectedId),
        ),
      );
      return;
    }
    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...paginatedContacts.map((contact) => contact.id),
      ]),
    ]);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsSaving(true);
    try {
      await deleteContact(deleteId);
      setContacts((current) =>
        current.filter((contact) => contact.id !== deleteId),
      );
      setSelectedIds((current) => current.filter((id) => id !== deleteId));
      setDeleteId(null);
      setPageError("");
      setNotice("Contact deleted.");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Unable to delete this contact.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (
    field: StringFieldKey,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      inputMode?: "text" | "email" | "tel" | "decimal";
      fullWidth?: boolean;
      placeholder?: string;
    } = {},
  ) => (
    <div className={options.fullWidth ? "md:col-span-2" : undefined}>
      <label
        htmlFor={`contact-${field}`}
        className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {options.required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={`contact-${field}`}
        type={options.type ?? "text"}
        inputMode={options.inputMode}
        placeholder={options.placeholder}
        value={formValues[field]}
        onChange={(event) => updateField(field, event.target.value)}
        aria-invalid={Boolean(formErrors[field])}
        aria-describedby={formErrors[field] ? `error-${field}` : undefined}
        className={`${inputClass}${formErrors[field] ? " border-red-500 focus:border-red-500 focus:ring-red-100" : ""}`}
      />
      {formErrors[field] && (
        <p id={`error-${field}`} className="mt-1 text-xs text-red-600">
          {formErrors[field]}
        </p>
      )}
    </div>
  );

  const renderSectionTitle = (title: string) => (
    <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
      <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h4>
    </div>
  );

  const renderAddressFields = (otherAddress = false) => {
    const prefix = otherAddress ? "other" : "";
    const field = (name: string) =>
      `${prefix}${name}` as StringFieldKey;
    return (
      <div className="grid gap-5 md:grid-cols-2">
        {renderInput(field("AddressLine1"), "Flat / House no. / Building", {
          required: true,
          placeholder: "Enter flat, house number or building",
        })}
        {renderInput(field("AddressLine2"), "Street address", {
          placeholder: "Enter street address",
        })}
        {renderInput(field("City"), "City", {
          required: true,
          placeholder: "Enter city",
        })}
        {renderInput(field("State"), "State", {
          required: true,
          placeholder: "Enter state",
        })}
        {renderInput(field("Country"), "Country", {
          required: true,
          placeholder: "Enter country",
        })}
        {renderInput(field("Pincode"), "Pincode", {
          required: true,
          placeholder: "Enter pincode",
        })}
        {renderInput(field("Latitude"), "Latitude", {
          inputMode: "decimal",
          placeholder: "e.g. 11.0168",
        })}
        {renderInput(field("Longitude"), "Longitude", {
          inputMode: "decimal",
          placeholder: "e.g. 76.9558",
        })}
      </div>
    );
  };

  return (
    <>
      <PageMeta
        title="Contacts | Yatzar Operations"
        description="Yatzar Operations contacts"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.contacts")} />
      {pageError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
        >
          {pageError}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
        >
          {notice}
        </div>
      )}

      {!showForm && (
        <section className="max-w-full min-w-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Contact Information
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage contact records and their information in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
          >
            <span className="text-lg leading-none">+</span>Add Contact
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-xs">
            <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-gray-400">
              ⌕
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search contacts"
              className="h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent px-3 ps-9 text-base text-gray-800 shadow-theme-xs transition outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 sm:text-sm dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <label className="flex items-center gap-2">
              Show
              <select
                value={entriesPerPage}
                onChange={(event) => {
                  setEntriesPerPage(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-gray-700 dark:border-gray-800 dark:text-gray-300"
              >
                {[5, 10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              entries
            </label>
          </div>
        </div>

        <div className="custom-scrollbar max-w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-start">
              <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                <tr>
                  <th className="w-12 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded accent-brand-500"
                      aria-label="Select all contacts on this page"
                    />
                  </th>
                  <th className={tableHeaderClass}>Contact Name</th>
                  <th className={tableHeaderClass}>Email</th>
                  <th className={tableHeaderClass}>Phone</th>
                  <th className={tableHeaderClass}>Department</th>
                  <th className={tableHeaderClass}>Lead Source</th>
                  <th className="px-3 py-3 text-center text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-white/2"
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(contact.id)}
                        onChange={() => toggleSelected(contact.id)}
                        className="size-4 rounded accent-brand-500"
                        aria-label={`Select ${contactName(contact)}`}
                      />
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-800 sm:px-5 dark:text-white/90">
                      {contactName(contact)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {contact.email}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {contact.phone}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {contact.department || "—"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {contact.leadSource}
                    </td>
                    <td className="px-3 py-4 sm:px-5">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium sm:gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            clearMessages();
                            setMoveRequest({ id: contact.id, to: "leads" });
                          }}
                          className="rounded-md p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                          aria-label={`Move ${contactName(contact)} to leads`}
                          title="Move to lead"
                        >
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M19 8v6M22 11h-6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearMessages();
                            setMoveRequest({ id: contact.id, to: "customers" });
                          }}
                          className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10"
                          aria-label={`Move ${contactName(contact)} to customers`}
                          title="Move to customer"
                        >
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="m16 11 2 2 4-4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => openViewForm(contact)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10"
                          aria-label={`View ${contactName(contact)}`}
                          title="View"
                        >
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(contact)}
                          className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          aria-label={`Edit ${contactName(contact)}`}
                          title="Edit"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" />
                            <path d="m13.5 6.5 4 4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearMessages();
                            setDeleteId(contact.id);
                          }}
                          className="rounded-md p-1.5 text-error-500 hover:bg-error-50 hover:text-error-600 dark:text-error-400 dark:hover:bg-error-500/10"
                          aria-label={`Delete ${contactName(contact)}`}
                          title="Delete"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M4 7h16" />
                            <path d="M9 7V4h6v3" />
                            <path d="M7 7l1 12h8l1-12" />
                            <path d="M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
          <div className="flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:items-center sm:gap-3 dark:text-gray-400">
            <span>
              {filteredContacts.length === 0
                ? "Showing 0 contacts"
                : `Showing ${startIndex + 1} to ${Math.min(
                    startIndex + entriesPerPage,
                    filteredContacts.length,
                  )} of ${filteredContacts.length} contacts`}
            </span>
            <span>{selectedCount} selected</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
            >
              Previous
            </button>
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`size-9 rounded-lg border text-sm font-medium ${currentPage === pageNumber ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"}`}
                aria-current={currentPage === pageNumber ? "page" : undefined}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>

        {filteredContacts.length === 0 && (
          <div className="mx-5 mb-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/2 dark:text-gray-400">
            {contacts.length === 0
              ? "No contacts yet. Select Add Contact to create one."
              : "No contacts match your search."}
          </div>
        )}
        </section>
      )}

      {showForm && (
        <div className="mx-auto w-full max-w-6xl">
          <div
            aria-labelledby="contact-form-title"
            className="flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark"
          >
            <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
              <div>
                <h3
                  id="contact-form-title"
                  className="text-lg font-semibold text-gray-800 dark:text-white/90"
                >
                  {viewing ? "View Contact" : editingId ? "Edit Contact" : "Add Contact"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Contact details are managed by the backend.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!viewing && <button type="button" onClick={() => handleSaveAndAdd("leads")} disabled={isSaving} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                  Move to lead
                </button>}
                {!viewing && <button type="button" onClick={() => handleSaveAndAdd("customers")} disabled={isSaving} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  Move to customer
                </button>}
                <button type="button" onClick={closeForm} disabled={isSaving} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                  Cancel
                </button>
                {!viewing && <button type="submit" form="contact-form" disabled={isSaving} className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600">
                  {isSaving ? "Saving..." : "Save contact"}
                </button>}
              </div>
            </div>

            <form
              id="contact-form"
              onSubmit={handleSave}
              noValidate
              className="flex min-h-0 flex-1 flex-col"
            >
              <fieldset disabled={viewing} className="min-h-0 flex-1">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-gray-50/60 p-4 sm:p-6 dark:bg-gray-950/20">
                <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-dark">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      {renderSectionTitle("Contact image")}
                      <label className={`mt-3 inline-flex items-center gap-3 ${viewing ? "" : "cursor-pointer"}`}>
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Contact preview"
                            className="size-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-400 dark:bg-white/5">
                            ♙
                          </span>
                        )}
                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                          {photoPreview ? "Change photo" : "Upload photo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                          disabled={isSaving}
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF, or WebP up to 5 MB.
                      </p>
                    </div>
                  </div>
                  {renderSectionTitle("Profile")}
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Your basic contact information.</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    {renderInput("contactOwner", "Contact owner", { placeholder: "Select contact owner" })}
                    <div>
                      <label htmlFor="contact-leadSource" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Lead source <span className="text-red-500">*</span>
                      </label>
                      <select id="contact-leadSource" value={formValues.leadSource} onChange={(event) => updateField("leadSource", event.target.value)} className={inputClass}>
                        <option value="">-None-</option>
                        {[...new Set([...leadSources, formValues.leadSource])].filter(Boolean).map((source) => <option key={source} value={source}>{source}</option>)}
                      </select>
                      {formErrors.leadSource && <p className="mt-1 text-xs text-red-600">{formErrors.leadSource}</p>}
                    </div>
                    {renderInput("firstName", "First Name", {
                      required: true,
                      placeholder: "Enter first name",
                    })}
                    {renderInput("lastName", "Last Name", {
                      placeholder: "Enter last name",
                    })}
                    {renderInput("email", "Email", {
                      required: true,
                      type: "email",
                      inputMode: "email",
                      placeholder: "name@example.com",
                    })}
                    {renderInput("secondaryEmail", "Secondary email", { type: "email", inputMode: "email", placeholder: "secondary@example.com" })}
                    {renderInput("phone", "Phone", {
                      required: true,
                      type: "tel",
                      inputMode: "tel",
                      placeholder: "Enter phone number",
                    })}
                    {renderInput("otherPhone", "Other Phone", {
                      type: "tel",
                      inputMode: "tel",
                      placeholder: "Enter alternate phone number",
                    })}
                    {renderInput("homePhone", "Home phone", { type: "tel", inputMode: "tel", placeholder: "Enter home phone" })}
                    {renderInput("mobile", "Mobile", { type: "tel", inputMode: "tel", placeholder: "Enter mobile number" })}
                    {renderInput("dateOfBirth", "Date of birth", { type: "date" })}
                    <label className="flex items-center gap-2 self-end pb-2 text-xs text-gray-600 dark:text-gray-300">
                      <input type="checkbox" checked={formValues.emailOptOut} onChange={(event) => updateField("emailOptOut", event.target.checked)} className="size-4 rounded accent-brand-500" />
                      Email opt out
                    </label>
                  </div>
                </section>

                <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      {renderSectionTitle("Address")}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Mailing and other address of this contact.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormValues((current) => ({
                          ...current,
                          otherAddressLine1: current.addressLine1,
                          otherAddressLine2: current.addressLine2,
                          otherCity: current.city,
                          otherState: current.state,
                          otherCountry: current.country,
                          otherPincode: current.pincode,
                        }))
                      }
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      Copy address
                    </button>
                  </div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Mailing address</p>
                  {renderAddressFields()}
                  <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                    <p className="mb-4 text-xs font-medium text-gray-700 dark:text-gray-300">Other address</p>
                    {renderAddressFields(true)}
                  </div>
                </section>
                <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-dark">
                  {renderSectionTitle("Description")}
                  <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Notes about this contact.</p>
                  <label htmlFor="contact-description" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea id="contact-description" value={formValues.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Add notes about this contact" rows={4} className={inputClass} />
                </section>

                {formError && (
                  <p role="alert" className="text-sm text-red-600">
                    {formError}
                  </p>
                )}
              </div>

              <div className="hidden flex-col-reverse gap-2 border-t border-gray-200 p-4 sm:flex-row sm:justify-end sm:p-5 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                {!viewing && <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving…"
                    : editingId
                      ? "Save Contact"
                      : "Save Contact"}
                </button>}
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {moveRequest && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="move-contact-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark"
          >
            <h3
              id="move-contact-title"
              className="text-xl font-semibold text-gray-800 dark:text-white/90"
            >
              Move to {moveRequest.to === "leads" ? "Leads" : "Customers"}
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {(() => {
                const contact = contacts.find((item) => item.id === moveRequest.id);
                return `${contact ? contactName(contact) : "This contact"} will be added to ${moveRequest.to === "leads" ? "Leads" : "Customers"} and removed from Contacts.`;
              })()}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMoveRequest(null)}
                disabled={isSaving}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMove}
                disabled={isSaving}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {isSaving ? "Moving…" : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-contact-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark"
          >
            <h3
              id="delete-contact-title"
              className="text-xl font-semibold text-gray-800 dark:text-white/90"
            >
              Confirm delete
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {contactToDelete
                ? `This will permanently remove ${contactName(contactToDelete)} from this browser.`
                : "This will permanently remove this contact from this browser."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={isSaving}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSaving}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {isSaving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
