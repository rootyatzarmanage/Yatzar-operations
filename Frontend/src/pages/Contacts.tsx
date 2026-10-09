import { listOptions } from "@/api/teams";
import {
  createLocalContact,
  deleteLocalContact,
  listLocalContacts,
  updateLocalContact,
  type ContactFields,
  type LocalContact,
} from "@/api/contactsLocalStore";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

const emptyForm: ContactFields = {
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

type FieldKey = keyof ContactFields;
type FieldErrors = Partial<Record<FieldKey, string>>;

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 transition outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800";
const tableHeaderClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

function contactName(contact: LocalContact): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
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
  const [initialContactState] = useState(() => {
    try {
      return { contacts: listLocalContacts(), error: "" };
    } catch (error) {
      return {
        contacts: [],
        error:
          error instanceof Error
            ? error.message
            : "Unable to load local contacts.",
      };
    }
  });
  const [contacts, setContacts] = useState<LocalContact[]>(
    initialContactState.contacts,
  );
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [leadSourcesLoading, setLeadSourcesLoading] = useState(true);
  const [leadSourcesError, setLeadSourcesError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<ContactFields>(emptyForm);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState(initialContactState.error);
  const [notice, setNotice] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5);

  useEffect(() => {
    let active = true;
    void listOptions("lead_source")
      .then((options) => {
        if (active) {
          setLeadSources(
            [...new Set(options.map((option) => option.value.trim()))].filter(
              Boolean,
            ),
          );
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
    setFormValues({ ...emptyForm });
    setFormErrors({});
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (contact: LocalContact) => {
    clearMessages();
    setEditingId(contact.id);
    setFormValues({
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
      latitude: contact.latitude,
      longitude: contact.longitude,
      otherAddressLine1: contact.otherAddressLine1,
      otherAddressLine2: contact.otherAddressLine2,
      otherCity: contact.otherCity,
      otherState: contact.otherState,
      otherCountry: contact.otherCountry,
      otherPincode: contact.otherPincode,
      otherLatitude: contact.otherLatitude,
      otherLongitude: contact.otherLongitude,
    });
    setFormErrors({});
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormValues({ ...emptyForm });
    setFormErrors({});
    setFormError("");
  };

  const updateField = (field: FieldKey, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};
    const requiredFields: [FieldKey, string][] = [
      ["firstName", "First name"],
      ["email", "Email"],
      ["phone", "Phone"],
      ["leadSource", "Lead source"],
      ["addressLine1", "Address Line 1"],
      ["city", "City"],
      ["state", "State"],
      ["country", "Country"],
      ["pincode", "Pincode"],
      ["latitude", "Latitude"],
      ["longitude", "Longitude"],
      ["otherAddressLine1", "Address Line 1"],
      ["otherCity", "City"],
      ["otherState", "State"],
      ["otherCountry", "Country"],
      ["otherPincode", "Pincode"],
      ["otherLatitude", "Latitude"],
      ["otherLongitude", "Longitude"],
    ];
    for (const [field, label] of requiredFields) {
      if (!formValues[field].trim()) errors[field] = `${label} is required.`;
    }

    if (
      formValues.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())
    ) {
      errors.email = "Enter a valid email address.";
    }
    errors.latitude = validateCoordinates(
      formValues.latitude,
      -90,
      90,
      "Latitude",
    );
    errors.longitude = validateCoordinates(
      formValues.longitude,
      -180,
      180,
      "Longitude",
    );
    errors.otherLatitude = validateCoordinates(
      formValues.otherLatitude,
      -90,
      90,
      "Other latitude",
    );
    errors.otherLongitude = validateCoordinates(
      formValues.otherLongitude,
      -180,
      180,
      "Other longitude",
    );

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

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = updateLocalContact(editingId, formValues);
        setContacts((current) =>
          current.map((contact) =>
            contact.id === updated.id ? updated : contact,
          ),
        );
        setNotice("Contact updated in this browser.");
      } else {
        const created = createLocalContact(formValues);
        setContacts((current) => [created, ...current]);
        setPage(1);
        setNotice("Contact saved in this browser.");
      }
      setPageError("");
      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save this contact.",
      );
    } finally {
      setIsSaving(false);
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

  const confirmDelete = () => {
    if (!deleteId) return;
    setIsSaving(true);
    try {
      deleteLocalContact(deleteId);
      setContacts((current) =>
        current.filter((contact) => contact.id !== deleteId),
      );
      setSelectedIds((current) => current.filter((id) => id !== deleteId));
      setDeleteId(null);
      setPageError("");
      setNotice("Contact deleted from this browser.");
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Unable to delete this contact.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderInput = (
    field: FieldKey,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      inputMode?: "text" | "email" | "tel" | "decimal";
      fullWidth?: boolean;
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
      `${prefix}${name}` as FieldKey;
    return (
      <div className="grid gap-5 md:grid-cols-2">
        {renderInput(field("AddressLine1"), "Address Line 1", {
          required: true,
          fullWidth: true,
        })}
        {renderInput(field("AddressLine2"), "Address Line 2", {
          fullWidth: true,
        })}
        {renderInput(field("City"), "City", { required: true })}
        {renderInput(field("State"), "State", {
          required: true,
        })}
        {renderInput(field("Country"), "Country", {
          required: true,
        })}
        {renderInput(field("Pincode"), "Pincode", {
          required: true,
        })}
        {renderInput(field("Latitude"), "Latitude", {
          required: true,
          inputMode: "decimal",
        })}
        {renderInput(field("Longitude"), "Longitude", {
          required: true,
          inputMode: "decimal",
        })}
      </div>
    );
  };

  return (
    <>
      <PageMeta
        title="Contacts | Yatzar Operation"
        description="Manage contact records and their information."
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.contacts")} />

      <div
        role="note"
        className="mb-4 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400"
      >
        Contacts CRUD is not connected to YO Backend yet. Records are saved in
        this browser only and are not shared with other users or devices.
      </div>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-3 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-form-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-dark"
          >
            <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
              <div>
                <h3
                  id="contact-form-title"
                  className="text-lg font-semibold text-gray-800 dark:text-white/90"
                >
                  {editingId ? "Edit Contact" : "Add Contact"}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Contact details are stored locally in this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="absolute top-4 right-4 rounded-md p-1 text-xl leading-none text-gray-500 hover:bg-gray-100 sm:static sm:text-2xl dark:text-gray-400 dark:hover:bg-white/5"
                aria-label="Close contact form"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSave}
              noValidate
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
                <section className="space-y-5">
                  {renderSectionTitle("Contact Information")}
                  <div className="grid gap-5 md:grid-cols-2">
                    {renderInput("firstName", "First Name", {
                      required: true,
                    })}
                    {renderInput("lastName", "Last Name")}
                    {renderInput("email", "Email", {
                      required: true,
                      type: "email",
                      inputMode: "email",
                    })}
                    {renderInput("phone", "Phone", {
                      required: true,
                      type: "tel",
                      inputMode: "tel",
                    })}
                    {renderInput("otherPhone", "Other Phone", {
                      type: "tel",
                      inputMode: "tel",
                    })}
                    {renderInput("department", "Department")}
                    <div>
                      <label
                        htmlFor="contact-leadSource"
                        className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Lead Source <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="contact-leadSource"
                        value={formValues.leadSource}
                        onChange={(event) =>
                          updateField("leadSource", event.target.value)
                        }
                        disabled={
                          leadSourcesLoading ||
                          (leadSources.length === 0 && !formValues.leadSource)
                        }
                        aria-invalid={Boolean(formErrors.leadSource)}
                        aria-describedby={
                          formErrors.leadSource
                            ? "error-leadSource"
                            : undefined
                        }
                        className={inputClass}
                      >
                        <option value="">
                          {leadSourcesLoading
                            ? "Loading configured lead sources…"
                            : leadSources.length
                              ? "Select a lead source"
                              : "No lead sources configured"}
                        </option>
                        {[...new Set([...leadSources, formValues.leadSource])]
                          .filter(Boolean)
                          .map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                      </select>
                      {formErrors.leadSource && (
                        <p
                          id="error-leadSource"
                          className="mt-1 text-xs text-red-600"
                        >
                          {formErrors.leadSource}
                        </p>
                      )}
                      {leadSourcesError && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                          Configured lead sources could not be loaded:{" "}
                          {leadSourcesError}
                        </p>
                      )}
                      {!leadSourcesLoading &&
                        !leadSourcesError &&
                        leadSources.length === 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Configure lead-source options in the backend before
                            adding a contact.
                          </p>
                        )}
                    </div>
                  </div>
                </section>

                <section className="space-y-5 border-t border-gray-100 pt-5 dark:border-gray-800">
                  {renderSectionTitle("Address")}
                  {renderAddressFields()}
                </section>

                <section className="space-y-5 border-t border-gray-100 pt-5 dark:border-gray-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {renderSectionTitle("Other Address")}
                    <button
                      type="button"
                      onClick={() => {
                        setFormValues((current) => ({
                          ...current,
                          otherAddressLine1: current.addressLine1,
                          otherAddressLine2: current.addressLine2,
                          otherCity: current.city,
                          otherState: current.state,
                          otherCountry: current.country,
                          otherPincode: current.pincode,
                          otherLatitude: current.latitude,
                          otherLongitude: current.longitude,
                        }));
                        setFormErrors((current) => ({
                          ...current,
                          otherAddressLine1: undefined,
                          otherCity: undefined,
                          otherState: undefined,
                          otherCountry: undefined,
                          otherPincode: undefined,
                          otherLatitude: undefined,
                          otherLongitude: undefined,
                        }));
                      }}
                      className="h-9 shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      Copy Current Address
                    </button>
                  </div>
                  {renderAddressFields(true)}
                </section>

                {formError && (
                  <p role="alert" className="text-sm text-red-600">
                    {formError}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 p-4 sm:flex-row sm:justify-end sm:p-5 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {isSaving
                    ? "Saving…"
                    : editingId
                      ? "Save Contact"
                      : "Save Contact"}
                </button>
              </div>
            </form>
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
