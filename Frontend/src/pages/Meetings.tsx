
import { listContacts } from "@/api/contacts";
import { listCustomers } from "@/api/customers";
import { listLeads } from "@/api/leads";
import {
  bulkDeleteMeetings,
  createMeeting,
  deleteMeeting,
  listMeetings,
  updateMeeting,
  type MeetingApi,
  type MeetingPayload,
  type MeetingProvider,
} from "@/api/meetings";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { hasPermission, useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { EmbedProps } from "@/components/records/embed";
import WorkspaceAssigneeField, { useWorkspaceMembers } from "@/components/activities/WorkspaceAssigneeField";

type ParticipantType = "contact" | "lead" | "customer";

type Person = {
  key: string;
  type: ParticipantType;
  name: string;
  email: string;
};

type Meeting = {
  id: string;
  title: string;
  venue: string;
  location: string;
  meetingProvider: MeetingProvider | "";
  meetingLink: string;
  allDay: boolean;
  from: string;
  to: string;
  participants: Person[];
  relatedTo: string;
  repeat: string;
  participantsReminder: string;
  participantsReminderTime: string;
  reminder: string;
  description: string;
  assignedTo: string;
};

const sourceLabels: Record<ParticipantType, string> = {
  contact: "Contact",
  lead: "Lead",
  customer: "Customer",
};

const venues = ["Client location", "In-office", "Online"];
const meetingProviders: MeetingProvider[] = ["Google Meet", "Zoom", "Microsoft Teams", "Webex", "Skype", "Other"];
const repeats = ["None", "Daily", "Weekly", "Monthly", "Yearly"];
const participantReminders = ["None", "Email", "Popup", "Email and Popup"];
const participantReminderTimes = [
  "None",
  "At time of meeting",
  "5 minutes before",
  "15 minutes before",
  "30 minutes before",
  "1 hour before",
  "1 day before",
];
const reminders = [
  "None",
  "At time of meeting",
  "5 minutes before",
  "10 minutes before",
  "15 minutes before",
  "30 minutes before",
  "1 hour before",
  "1 day before",
];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90";
const labelClass =
  "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";
const thClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function defaultRange() {
  const now = new Date();
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { from: `${day}T15:00`, to: `${day}T16:00` };
}

function makeEmptyForm() {
  const { from, to } = defaultRange();
  return {
    title: "New Meeting",
    venue: "Client location",
    location: "",
    meetingProvider: "",
    meetingLink: "",
    allDay: false,
    from,
    to,
    participants: [] as Person[],
    relatedTo: "",
    repeat: "None",
    participantsReminder: "None",
    participantsReminderTime: "None",
    reminder: "15 minutes before",
    description: "",
    assignedTo: "",
  };
}

function formatDateTime(value: string) {
  if (!value) return "—";
  const [date, time] = value.split("T");
  const [y, m, d] = date.split("-");
  if (!time) return `${d}/${m}/${y}`;
  const [h, min] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${d}/${m}/${y} ${h % 12 || 12}:${pad(min)} ${suffix}`;
}

function toFormDateTime(value: string) {
  return value ? value.slice(0, 16) : "";
}

function toApiDateTime(value: string, allDay: boolean) {
  return allDay ? `${value.slice(0, 10)}T00:00:00` : value;
}

export default function Meetings({ embed }: EmbedProps = {}) {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "Meetings", "create");
  const canUpdate = hasPermission(user, "Meetings", "update");
  const canDelete = hasPermission(user, "Meetings", "delete");
  const { currentWorkspace } = useWorkspace();
  const workspaceMembers = useWorkspaceMembers();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(makeEmptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState("");
  const [notice, setNotice] = useState("");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Participants picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSource, setPickerSource] =
    useState<ParticipantType>("contact");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSelection, setPickerSelection] = useState<Person[]>([]);

  useEffect(() => {
    setPeople([]);
    setMeetings([]);
    const fail =
      (label: string) =>
      (error: unknown) =>
        setApiError(
          error instanceof Error ? error.message : `Unable to load ${label}.`,
        );

    void listContacts()
      .then((items) =>
        items.map<Person>((c) => ({
          key: `contact:${c.id}`,
          type: "contact",
          name:
            `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ||
            c.email ||
            "Unnamed",
          email: c.email ?? "",
        })),
      )
      .then((items) =>
        setPeople((cur) => [
          ...cur.filter((p) => p.type !== "contact"),
          ...items,
        ]),
      )
      .catch(fail("contacts"));

    void listLeads()
      .then((items) =>
        items.map<Person>((r) => ({
          key: `lead:${r.id}`,
          type: "lead",
          name:
            `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() ||
            String(r.email ?? "") ||
            "Unnamed",
          email: String(r.email ?? ""),
        })),
      )
      .then((items) =>
        setPeople((cur) => [
          ...cur.filter((p) => p.type !== "lead"),
          ...items,
        ]),
      )
      .catch(fail("leads"));

    void listCustomers()
      .then((items) =>
        items.map<Person>((r) => ({
          key: `customer:${r.id}`,
          type: "customer",
          name:
            `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() ||
            String(r.email ?? "") ||
            "Unnamed",
          email: String(r.email ?? ""),
        })),
      )
      .then((items) =>
        setPeople((cur) => [
          ...cur.filter((p) => p.type !== "customer"),
          ...items,
        ]),
      )
      .catch(fail("customers"));

    void listMeetings({ page: 1, perPage: 100 })
      .then((result) =>
        setMeetings(result.items.map((meeting) => fromApiMeeting(meeting, []))),
      )
      .catch(fail("meetings"));
  }, [currentWorkspace?.id]);

  function fromApiMeeting(
    meeting: MeetingApi,
    availablePeople: Person[],
  ): Meeting {
    return {
      id: meeting.id,
      title: meeting.title,
      venue: meeting.venue ?? "",
      location: meeting.location ?? "",
      meetingProvider: meeting.meeting_provider ?? "",
      meetingLink: meeting.meeting_link ?? "",
      allDay: meeting.all_day,
      from: toFormDateTime(meeting.starts_at),
      to: toFormDateTime(meeting.ends_at),
      participants: meeting.participants.map((participant) => {
        const key = `${participant.type}:${participant.id}`;
        const person = availablePeople.find((item) => item.key === key);

        return (
          person ?? {
            key,
            type: participant.type,
            name: participant.id,
            email: "",
          }
        );
      }),
      relatedTo: meeting.related_to ?? "",
      repeat: meeting.repeat_frequency,
      participantsReminder: meeting.participants_reminder,
      participantsReminderTime: meeting.reminder_type,
      reminder: meeting.reminder,
      description: meeting.description ?? "",
      assignedTo: meeting.assigned_to ?? "",
    };
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return meetings;

    return meetings.filter((m) =>
      [
        m.title,
        m.venue,
        m.location,
        m.relatedTo,
        m.participants.map((p) => p.name).join(" "),
      ].some((v) => v.toLowerCase().includes(q)),
    );
  }, [meetings, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / entriesPerPage),
  );
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * entriesPerPage;
  const visible = filtered.slice(start, start + entriesPerPage);

  const selectedCount = selectedIds.length;
  const allVisibleSelected =
    visible.length > 0 &&
    visible.every((meeting) => selectedIds.includes(meeting.id));

  const toggleMeeting = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (id) => !visible.some((meeting) => meeting.id === id),
        );
      }

      const additions = visible
        .filter((meeting) => !current.includes(meeting.id))
        .map((meeting) => meeting.id);

      return [...current, ...additions];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const handleBulkDelete = async () => {
    if (!canDelete) return;
    const idsToDelete = selectedIds.filter((id) =>
      meetings.some((meeting) => meeting.id === id),
    );

    if (idsToDelete.length === 0 || isBulkDeleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${idsToDelete.length} selected meeting(s)?`,
    );

    if (!confirmed) return;

    setIsBulkDeleting(true);
    setApiError("");
    setNotice("");

    try {
      const result = await bulkDeleteMeetings(idsToDelete);

      setMeetings((current) =>
        current.filter((meeting) => !idsToDelete.includes(meeting.id)),
      );
      setSelectedIds([]);
      setPage(1);
      setNotice(`${result.deleted} meeting(s) deleted successfully.`);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to delete selected meetings.",
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const pickerList = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();

    return people.filter(
      (p) =>
        p.type === pickerSource &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)),
    );
  }, [people, pickerSource, pickerSearch]);

  const isPicked = (key: string) =>
    pickerSelection.some((p) => p.key === key);

  const allListPicked =
    pickerList.length > 0 && pickerList.every((p) => isPicked(p.key));

  const togglePerson = (person: Person) =>
    setPickerSelection((cur) =>
      cur.some((p) => p.key === person.key)
        ? cur.filter((p) => p.key !== person.key)
        : [...cur, person],
    );

  const toggleAllInList = () =>
    setPickerSelection((cur) => {
      if (allListPicked) {
        return cur.filter(
          (p) => !pickerList.some((l) => l.key === p.key),
        );
      }

      const missing = pickerList.filter(
        (l) => !cur.some((p) => p.key === l.key),
      );

      return [...cur, ...missing];
    });

  const openPicker = () => {
    setPickerSelection(form.participants);
    setPickerSource("contact");
    setPickerSearch("");
    setPickerOpen(true);
  };

  const applyPicker = () => {
    setForm((cur) => ({ ...cur, participants: pickerSelection }));
    setPickerOpen(false);
  };

  const openAdd = () => {
    if (!canCreate) return;
    setEditingId(null);
    setForm(makeEmptyForm());
    setForm((current) => ({ ...current, assignedTo: user?.id ?? "" }));
    setApiError("");
    setNotice("");
    setShowForm(true);
  };

  const openEdit = (m: Meeting) => {
    if (!canUpdate) return;
    setEditingId(m.id);
    const { id: _id, ...rest } = m;
    void _id;
    setForm(rest);
    setApiError("");
    setNotice("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setPickerOpen(false);
    embed?.onClose();
  };

  const handleSave = async (event: FormEvent) => {
    if (editingId ? !canUpdate : !canCreate) return;
    event.preventDefault();
    if (form.venue === "Online" && !form.meetingProvider) {
      setApiError("Select an online meeting platform.");
      return;
    }

    const payload: MeetingPayload = {
      title: form.title.trim(),
      assigned_to: form.assignedTo || null,
      venue: form.venue || null,
      location: form.location.trim() || null,
      meeting_provider: form.venue === "Online" ? form.meetingProvider || null : null,
      meeting_link: form.venue === "Online" ? form.meetingLink.trim() || null : null,
      all_day: form.allDay,
      starts_at: toApiDateTime(form.from, form.allDay),
      ends_at: toApiDateTime(form.to, form.allDay),
      participants: form.participants.map((person) => ({
        id: person.key.split(":")[1],
        type: person.type,
      })),
      related_to: form.relatedTo.trim() || null,
      repeat_frequency: form.repeat,
      reminder: form.reminder,
      participants_reminder: form.participantsReminder,
      reminder_type: form.participantsReminderTime,
      description: form.description.trim() || null,
    };

    try {
      setApiError("");
      setNotice("");

      const saved = editingId
        ? await updateMeeting(editingId, payload)
        : await createMeeting(payload);

      const meeting = fromApiMeeting(saved, people);

      setMeetings((cur) =>
        editingId
          ? cur.map((item) => (item.id === editingId ? meeting : item))
          : [meeting, ...cur],
      );

      setSelectedIds((cur) => cur.filter((id) => id !== meeting.id));
      setPage(1);
      closeForm();
      setNotice(editingId ? "Meeting updated successfully." : "Meeting created successfully.");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to save meeting.",
      );
    }
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    if (!deleteId) return;

    try {
      setApiError("");
      setNotice("");

      await deleteMeeting(deleteId);

      setMeetings((cur) =>
        cur.filter((meeting) => meeting.id !== deleteId),
      );
      setSelectedIds((cur) => cur.filter((id) => id !== deleteId));
      setDeleteId(null);
      setNotice("Meeting deleted successfully.");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to delete meeting.",
      );
    }
  };

  const setAllDay = (allDay: boolean) =>
    setForm((cur) => ({
      ...cur,
      allDay,
      from: allDay
        ? cur.from.slice(0, 10)
        : `${cur.from.slice(0, 10)}T15:00`,
      to: allDay
        ? cur.to.slice(0, 10)
        : `${cur.to.slice(0, 10)}T16:00`,
    }));

  const renderSelect = (
    id: string,
    label: string,
    value: string,
    options: string[],
    onChange: (v: string) => void,
  ) => (
    <div>
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  const embedInit = useRef(false);
  useEffect(() => {
    if (!embed || embedInit.current) return;
    if (!embed.editId) {
      embedInit.current = true;
      openAdd();
      return;
    }
    const target = meetings.find((x) => x.id === embed.editId);
    if (target) {
      embedInit.current = true;
      openEdit(target);
    }
  });

  return (
    <>
      {!embed && (
        <PageMeta
          title="Meetings | Yatzar Operations"
          description="Yatzar Operations meetings"
        />
      )}
      {!embed && <PageBreadcrumb pageTitle="Meetings" parent={{ label: "Activities" }} />}

      {apiError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
        >
          {apiError}
        </div>
      )}

      {notice && !apiError && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700"
        >
          {notice}
        </div>
      )}

      {!showForm && !embed && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Meeting information
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Schedule and manage meetings in one place.
              </p>
            </div>
            {canCreate && <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              <span className="text-lg leading-none">+</span>
              Create Meeting
            </button>}
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search meetings"
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 sm:max-w-xs dark:border-gray-800 dark:text-white/90"
            />
            <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              Show
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-gray-700 dark:border-gray-800 dark:text-gray-300"
              >
                {[5, 10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              entries
            </label>
          </div>

          {/* Bulk action toolbar */}
          {canDelete && selectedCount > 0 && (
            <div className="flex flex-col gap-3 border-y border-gray-200 bg-blue-50/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/5">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{selectedCount}</strong> selected
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isBulkDeleting}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Clear selection
                </button>

                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={isBulkDeleting}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M4 7h16" />
                    <path d="M9 7V4h6v3" />
                    <path d="M7 7l1 12h8l1-12" />
                    <path d="M10 11v5M14 11v5" />
                  </svg>
                  {isBulkDeleting
                    ? "Deleting..."
                    : `Delete ${selectedCount}`}
                </button>
              </div>
            </div>
          )}

          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[950px] text-start">
              <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                <tr>
                  {canDelete && <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all visible meetings"
                      className="size-4 cursor-pointer accent-brand-500"
                    />
                  </th>}
                  <th className={thClass}>Title</th>
                  <th className={thClass}>From</th>
                  <th className={thClass}>To</th>
                  <th className={thClass}>Platform</th>
                  <th className={thClass}>Related to</th>
                  <th className={thClass}>Contact Name</th>
                  <th className={thClass}>Related To</th>
                  <th className={thClass}>Assigned to</th>
                  {(canUpdate || canDelete) && <th className={thClass}>Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map((m) => (
                  <tr
                    key={m.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-white/2"
                  >
                    {canDelete && <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleMeeting(m.id)}
                        aria-label={`Select meeting ${m.title}`}
                        className="size-4 cursor-pointer accent-brand-500"
                      />
                    </td>}
                    <td className="px-3 py-4 text-sm font-medium text-gray-800 sm:px-5 dark:text-white/90">
                      {m.title || "Untitled meeting"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {formatDateTime(m.from)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {formatDateTime(m.to)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {m.meetingProvider || "—"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {m.venue}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {m.participants.map((p) => p.name).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {m.relatedTo || "—"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {workspaceMembers.find((member) => member.id === m.assignedTo)?.name ?? (m.assignedTo === user?.id ? user?.display_name || user?.employee_name || user?.username : "—")}
                    </td>
                    {(canUpdate || canDelete) && <td className="px-3 py-4 sm:px-5">
                      <div className="flex items-center gap-1">
                        {canUpdate && <button
                          type="button"
                          onClick={() => openEdit(m)}
                          title="Edit"
                          aria-label="Edit"
                          className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50"
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
                        </button>}
                        {canDelete && <button
                          type="button"
                          onClick={() => setDeleteId(m.id)}
                          title="Delete"
                          aria-label="Delete"
                          className="rounded-md p-1.5 text-error-500 hover:bg-error-50"
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
                        </button>}
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="mx-5 my-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/2 dark:text-gray-400">
              {meetings.length === 0
                ? "No meetings yet. Select Create Meeting to add one."
                : "No meetings match your search."}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-200 p-4 text-sm text-gray-500 sm:p-5 dark:border-gray-800 dark:text-gray-400">
            <span>
              Total Records{" "}
              <b className="text-gray-800 dark:text-white/90">
                {filtered.length}
              </b>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
                className="size-9 rounded-lg border border-gray-200 disabled:opacity-40 dark:border-gray-800"
              >
                ‹
              </button>
              <span>
                {filtered.length === 0 ? 0 : start + 1} to{" "}
                {Math.min(start + entriesPerPage, filtered.length)}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
                className="size-9 rounded-lg border border-gray-200 disabled:opacity-40 dark:border-gray-800"
              >
                ›
              </button>
            </div>
          </div>
        </section>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          noValidate
          className="mx-auto w-full max-w-6xl rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark"
        >
          <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {editingId ? "Edit meeting" : "Add meeting"}
            </h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              {(editingId ? canUpdate : canCreate) && <button
                type="submit"
                className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
              >
                Save meeting
              </button>}
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Meeting information
            </h4>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="meeting-title" className={labelClass}>
                  Title
                </label>
                <input
                  maxLength={255}
                  id="meeting-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="Enter title"
                  className={inputClass}
                />
              </div>

              <WorkspaceAssigneeField
                id="meeting-assigned-to"
                value={form.assignedTo}
                members={workspaceMembers}
                onChange={(assignedTo) => setForm((current) => ({ ...current, assignedTo }))}
              />

              {renderSelect("meeting-venue", "Meeting venue", form.venue, venues, (v) =>
                setForm({ ...form, venue: v, meetingProvider: v === "Online" ? form.meetingProvider : "", meetingLink: v === "Online" ? form.meetingLink : "" }),
              )}

              {form.venue === "Online" && (
                <>
                  <div>
                    <label htmlFor="meeting-provider" className={labelClass}>Online meeting platform</label>
                    <select
                      id="meeting-provider"
                      value={form.meetingProvider}
                      onChange={(event) => setForm({ ...form, meetingProvider: event.target.value as MeetingProvider | "" })}
                      className={inputClass}
                      required
                    >
                      <option value="">Select a platform</option>
                      {meetingProviders.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="meeting-link" className={labelClass}>Meeting link</label>
                    <input
                      id="meeting-link"
                      type="url"
                      maxLength={1000}
                      value={form.meetingLink}
                      onChange={(event) => setForm({ ...form, meetingLink: event.target.value })}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {(form.venue === "Client location" || form.venue === "In-office") && (
                <div>
                  <label htmlFor="meeting-location" className={labelClass}>
                    Location
                  </label>
                  <input
                    id="meeting-location"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    placeholder="Enter location"
                    className={inputClass}
                  />
                </div>
              )}

              <label className="flex items-center gap-2 self-center pt-7 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="size-4 accent-brand-500"
                />
                All day
              </label>

              <div>
                <label htmlFor="meeting-from" className={labelClass}>
                  From
                </label>
                <input
                  id="meeting-from"
                  type={form.allDay ? "date" : "datetime-local"}
                  value={form.from}
                  onChange={(e) =>
                    setForm({ ...form, from: e.target.value })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="meeting-to" className={labelClass}>
                  To
                </label>
                <input
                  id="meeting-to"
                  type={form.allDay ? "date" : "datetime-local"}
                  value={form.to}
                  onChange={(e) =>
                    setForm({ ...form, to: e.target.value })
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Participants</label>
                <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-800">
                  <div className="flex flex-wrap gap-1.5">
                    {form.participants.length === 0 && (
                      <span className="text-gray-400">None</span>
                    )}
                    {form.participants.map((p) => (
                      <span
                        key={p.key}
                        className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={openPicker}
                    className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    Select
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="meeting-related" className={labelClass}>
                  Related to
                </label>
                <input
                  id="meeting-related"
                  value={form.relatedTo}
                  onChange={(e) =>
                    setForm({ ...form, relatedTo: e.target.value })
                  }
                  placeholder="None"
                  className={inputClass}
                />
              </div>

              {renderSelect("meeting-repeat", "Repeat", form.repeat, repeats, (v) =>
                setForm({ ...form, repeat: v }),
              )}

              <div className="space-y-4">
                {renderSelect(
                  "meeting-pr",
                  "Participants reminder",
                  form.participantsReminder,
                  participantReminders,
                  (v) => setForm({ ...form, participantsReminder: v }),
                )}
              </div>

              {renderSelect("meeting-reminder", "Reminder", form.reminder, reminders, (v) =>
                setForm({ ...form, reminder: v }),
              )}
            </div>

            <div>
              <label htmlFor="meeting-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="meeting-description"
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Enter description"
                className={inputClass}
              />
            </div>
          </div>
        </form>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl dark:bg-gray-dark"
          >
            <div className="border-b border-gray-200 p-6 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Select participants
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose from contacts, leads and customers. Your selections are
                kept when you switch the list.
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="flex gap-3">
                <select
                  value={pickerSource}
                  onChange={(e) =>
                    setPickerSource(e.target.value as ParticipantType)
                  }
                  className={`${inputClass} !w-40`}
                >
                  {(Object.keys(sourceLabels) as ParticipantType[]).map((t) => (
                    <option key={t} value={t}>
                      {sourceLabels[t]}
                    </option>
                  ))}
                </select>
                <input
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search by name or email"
                  className={inputClass}
                />
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allListPicked}
                    onChange={toggleAllInList}
                    className="size-4 accent-brand-500"
                  />
                  Select all in this list
                </label>
                <span className="text-gray-500">
                  {pickerSelection.length} selected
                </span>
              </div>

              <div className="custom-scrollbar max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {pickerList.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">
                    Nothing to select.
                  </p>
                )}
                {pickerList.map((p) => (
                  <label
                    key={p.key}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={isPicked(p.key)}
                      onChange={() => togglePerson(p)}
                      className="size-4 accent-brand-500"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                        {p.name}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {p.email}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {pickerSelection.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-gray-500">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {pickerSelection.map((p) => (
                      <span
                        key={p.key}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                      >
                        {p.name}{" "}
                        <span className="text-gray-400">
                          ({sourceLabels[p.type]})
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => togglePerson(p)}
                          className="ml-1 text-gray-500 hover:text-gray-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-5 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyPicker}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Confirm delete
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              This will permanently remove this meeting.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
