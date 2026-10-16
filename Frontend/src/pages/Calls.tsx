import { listContacts, type Contact } from "@/api/contacts";
import {
  createCall,
  deleteCall,
  listCalls,
  updateCall,
  type CallApi,
  type CallPayload,
} from "@/api/calls";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { EmbedProps } from "@/components/records/embed";

type CallType = "Outbound" | "Inbound" | "Missed";
type CallStatus = "Completed" | "Scheduled" | "Missed";
type CallKind = "log" | "schedule";
type View = "list" | CallKind;

type Call = {
  id: string;
  kind: CallKind;
  subject: string;
  callType: CallType;
  status: CallStatus;
  startTime: string; // yyyy-mm-ddThh:mm (local)
  durationSeconds: number | null;
  account: string;
  contactId: string;
  contactName: string;
  owner: string;
  voiceRecording: string;
  reminder: string;
  purpose: string;
  agenda: string;
};

const callTypes: CallType[] = ["Outbound", "Inbound", "Missed"];
const loggedStatuses: CallStatus[] = ["Completed", "Missed"];
const reminders = ["None", "At time of call", "5 minutes before", "15 minutes before", "30 minutes before", "1 hour before", "1 day before"];
const purposes = ["-None-", "Prospecting", "Administrative", "Negotiation", "Demo", "Project", "Desk"];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-white/3 dark:text-white/90";
const labelClass = "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";
const thClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

const statusBadge: Record<CallStatus, string> = {
  Completed: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  Scheduled: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  Missed: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
};

// ---------- helpers ----------
const pad = (n: number) => String(n).padStart(2, "0");

/** Current local time in the format <input type="datetime-local"> expects. */
function nowLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(value: string) {
  if (!value) return "—";
  const [date, time = ""] = value.split("T");
  const [y, m, d] = date.split("-");
  const [h, min] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${d}/${m}/${y} ${pad(h % 12 || 12)}:${pad(min)} ${suffix}`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

function contactFullName(c: Contact) {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || "Unnamed";
}

function defaultSubject(kind: CallKind, callType: CallType, name: string) {
  const who = name || "Unknown";
  if (kind === "schedule") return `Call scheduled with ${who}`;
  if (callType === "Inbound") return `Incoming call from ${who}`;
  if (callType === "Missed") return `Missed call from ${who}`;
  return `Outgoing call to ${who}`;
}

const emptyForm = {
  contactId: "",
  account: "",
  callType: "Outbound" as CallType,
  status: "Completed" as CallStatus,
  startTime: "",
  minutes: "",
  seconds: "",
  subject: "",
  subjectEdited: false,
  voiceRecording: "",
  reminder: "None",
  purpose: "-None-",
  agenda: "",
};

type FormErrors = { contactId?: string; startTime?: string; duration?: string };

export default function Calls({ embed }: EmbedProps = {}) {
  const { user } = useAuth();
  const callOwner = user?.display_name || user?.employee_name || user?.username || "";

  const [calls, setCalls] = useState<Call[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [apiError, setApiError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.all([listContacts(), listCalls({ page: 1, perPage: 100 })])
      .then(([contactItems, callResult]) => {
        setContacts(contactItems);
        setCalls(callResult.items.map((call) => fromApiCall(call, contactItems)));
      })
      .catch((error: unknown) =>
        setApiError(error instanceof Error ? error.message : "Unable to load calls."),
      );
  }, []);

  function fromApiCall(call: CallApi, availableContacts: Contact[]): Call {
    const contact = availableContacts.find((item) => item.id === call.contact_id);
    const durationSeconds =
      call.duration_minutes === null && call.duration_seconds === null
        ? null
        : (call.duration_minutes ?? 0) * 60 + (call.duration_seconds ?? 0);
    return {
      id: call.id,
      kind: call.call_status === "Scheduled" ? "schedule" : "log",
      subject: call.subject,
      callType: call.call_type,
      status: call.call_status,
      startTime: call.call_start_time.slice(0, 16),
      durationSeconds,
      account: call.related_to ?? "",
      contactId: call.contact_id,
      contactName: contact ? contactFullName(contact) : "",
      owner: callOwner,
      voiceRecording: call.voice_recording ?? "",
      reminder: call.reminder ?? "None",
      purpose: call.call_purpose ?? "-None-",
      agenda: call.call_agenda ?? "",
    };
  }

  // close the "Create Call" dropdown on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isSchedule = view === "schedule";
  const isOutbound = isSchedule || form.callType === "Outbound";
  const selectedContact = contacts.find((c) => c.id === form.contactId);
  const selectedName = selectedContact ? contactFullName(selectedContact) : "";
  const subjectValue = form.subjectEdited
    ? form.subject
    : defaultSubject(isSchedule ? "schedule" : "log", form.callType, selectedName);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return calls;
    return calls.filter((c) =>
      [c.subject, c.callType, c.status, c.account, c.contactName, c.owner || callOwner].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [calls, callOwner, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * entriesPerPage;
  const visible = filtered.slice(start, start + entriesPerPage);
  const visibleIds = visible.map((call) => call.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const bulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} calls?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteCall(id)));
      setCalls((current) => current.filter((call) => !selectedIds.includes(call.id)));
      setSelectedIds([]);
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : "Unable to delete calls.");
    }
  };

  // ---------- actions ----------
  const openAdd = (kind: CallKind) => {
    setMenuOpen(false);
    setEditingId(null);
    setErrors({});
    setForm({
      ...emptyForm,
      startTime: nowLocal(),
      status: kind === "schedule" ? "Scheduled" : "Completed",
    });
    setView(kind);
  };

  const openEdit = (call: Call) => {
    const mins = call.durationSeconds === null ? "" : String(Math.floor(call.durationSeconds / 60));
    const secs = call.durationSeconds === null ? "" : String(call.durationSeconds % 60);
    setEditingId(call.id);
    setErrors({});
    setForm({
      contactId: call.contactId,
      account: call.account,
      callType: call.callType,
      status: call.status,
      startTime: call.startTime,
      minutes: mins,
      seconds: secs,
      subject: call.subject,
      subjectEdited: true,
      voiceRecording: call.voiceRecording,
      reminder: call.reminder,
      purpose: call.purpose,
      agenda: call.agenda,
    });
    setView(call.kind);
  };

  const closeForm = () => {
    setView("list");
    setEditingId(null);
    setErrors({});
    embed?.onClose();
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    const next: FormErrors = {};

    let durationSeconds: number | null = null;
    if (!isSchedule && form.callType !== "Missed") {
      if (form.minutes !== "" || form.seconds !== "") {
        const m = Number(form.minutes || 0);
        const s = Number(form.seconds || 0);

        if (
          m < 0 ||
          s < 0 ||
          s > 59 ||
          !Number.isInteger(m) ||
          !Number.isInteger(s)
        ) {
          next.duration =
            "Enter whole minutes and seconds (0–59).";
        } else {
          durationSeconds = m * 60 + s;
        }
      }
    }

    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    try {
      setApiError("");
      const payload: CallPayload = {
        contact_id: form.contactId,
        subject: subjectValue.trim() || defaultSubject(isSchedule ? "schedule" : "log", form.callType, selectedName),
        call_type: isSchedule ? "Outbound" : form.callType,
        call_status: isSchedule ? "Scheduled" : form.status,
        call_start_time: form.startTime,
        duration_minutes: durationSeconds === null ? null : Math.floor(durationSeconds / 60),
        duration_seconds: durationSeconds === null ? null : durationSeconds % 60,
        related_to: form.account.trim() || null,
        voice_recording: isSchedule ? null : form.voiceRecording.trim() || null,
        call_purpose: isOutbound ? form.purpose : "-None-",
        call_agenda: isOutbound ? form.agenda.trim() || null : null,
        reminder: isSchedule ? form.reminder : "None",
      };
      const savedApi = editingId
        ? await updateCall(editingId, payload)
        : await createCall(payload);
      const saved = fromApiCall(savedApi, contacts);
      setCalls((current) =>
        editingId ? current.map((c) => (c.id === editingId ? saved : c)) : [saved, ...current],
      );
      setPage(1);
      closeForm();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to save call.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setApiError("");
      await deleteCall(deleteId);
      setCalls((current) => current.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to delete call.");
    }
  };

  const showForm = view !== "list";
  const formTitle = isSchedule ? (editingId ? "Edit scheduled call" : "Schedule a call") : editingId ? "Edit call log" : "Log a call";
  const submitLabel = isSchedule ? (editingId ? "Save" : "Schedule") : "Save";

  const embedInit = useRef(false);
  useEffect(() => {
    if (!embed || embedInit.current) return;
    if (!embed.editId) {
      embedInit.current = true;
      openAdd("schedule");
      return;
    }
    const target = calls.find((x) => x.id === embed.editId);
    if (target) {
      embedInit.current = true;
      openEdit(target);
    }
  });

  return (
    <>
      {!embed && <PageMeta title="Calls | Yatzar Operations" description="Yatzar Operations calls" />}
      {!embed && <PageBreadcrumb pageTitle="Calls" parent={{ label: "Activities" }} />}
      {apiError && (
        <div role="alert" className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {apiError}
        </div>
      )}

      {/* ---------------- LIST ---------------- */}
      {!showForm && !embed && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Call information</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Log, schedule and track calls in one place.</p>
            </div>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                <span className="text-lg leading-none">+</span>Create Call
                <svg viewBox="0 0 24 24" className={`size-4 transition ${menuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-dark">
                  <button type="button" role="menuitem" onClick={() => openAdd("log")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                    Log a call
                  </button>
                  <button type="button" role="menuitem" onClick={() => openAdd("schedule")} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5">
                    Schedule a call
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search calls"
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
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              entries
            </label>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between border-b border-gray-200 bg-blue-50 px-5 py-3 text-sm dark:border-gray-800 dark:bg-white/5">
              <span>{selectedIds.length} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-transparent">Clear selection</button>
                <button type="button" onClick={() => void bulkDelete()} className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white">Delete {selectedIds.length}</button>
              </div>
            </div>
          )}

          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1000px] text-start">
              <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                <tr>
                  <th className="w-12 px-5 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds((current) => allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])])} className="size-4 accent-brand-500" aria-label="Select all" /></th>
                  <th className={thClass}>Subject</th>
                  <th className={thClass}>Call type</th>
                  <th className={thClass}>Call start time</th>
                  <th className={thClass}>Call duration</th>
                  <th className={thClass}>Related to</th>
                  <th className={thClass}>Contact name</th>
                  <th className={thClass}>Call owner</th>
                  <th className={thClass}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map((call) => (
                  <tr key={call.id} className="transition hover:bg-gray-50 dark:hover:bg-white/2">
                    <td className="px-5 py-4"><input type="checkbox" checked={selectedIds.includes(call.id)} onChange={() => setSelectedIds((current) => current.includes(call.id) ? current.filter((id) => id !== call.id) : [...current, call.id])} className="size-4 accent-brand-500" aria-label={`Select ${call.subject}`} /></td>
                    <td className="px-3 py-4 text-sm font-medium whitespace-nowrap text-gray-800 sm:px-5 dark:text-white/90">
                      {call.subject}
                      <span className={`ml-3 rounded-full px-2.5 py-1 text-xs font-normal ${statusBadge[call.status]}`}>{call.status}</span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{call.callType}</td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-600 sm:px-5 dark:text-gray-300">{formatDateTime(call.startTime)}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{formatDuration(call.durationSeconds)}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{call.account || "—"}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{call.contactName || "—"}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{call.owner || callOwner}</td>
                    <td className="px-3 py-4 sm:px-5">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(call)} title="Edit" aria-label="Edit" className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50">
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m13.5 6.5 4 4" /></svg>
                        </button>
                        <button type="button" onClick={() => setDeleteId(call.id)} title="Delete" aria-label="Delete" className="rounded-md p-1.5 text-error-500 hover:bg-error-50">
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M7 7l1 12h8l1-12" /><path d="M10 11v5M14 11v5" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="mx-5 my-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/2 dark:text-gray-400">
              {calls.length === 0 ? "No calls yet. Select Create Call to log or schedule one." : "No calls match your search."}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-200 p-4 text-sm text-gray-500 sm:p-5 dark:border-gray-800 dark:text-gray-400">
            <span>Total Records <b className="text-gray-800 dark:text-white/90">{filtered.length}</b></span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="size-9 rounded-lg border border-gray-200 disabled:opacity-40 dark:border-gray-800">‹</button>
              <span>{filtered.length === 0 ? 0 : start + 1} to {Math.min(start + entriesPerPage, filtered.length)}</span>
              <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="size-9 rounded-lg border border-gray-200 disabled:opacity-40 dark:border-gray-800">›</button>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- FORM (Log a call / Schedule a call) ---------------- */}
      {showForm && (
        <form
          onSubmit={handleSave}
          noValidate
          className="w-full rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark"
        >
          <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{formTitle}</h3>
            <div className="flex gap-3">
              <button type="button" onClick={closeForm} className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300">
                Cancel
              </button>
              <button type="submit" className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600">
                {submitLabel}
              </button>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Call information</h4>
            <div className="grid gap-5 md:grid-cols-2">
              {/* Call for */}
              <div>
                <label htmlFor="call-for" className={labelClass}>Call for</label>
                <select
                  id="call-for"
                  value={form.contactId}
                  onChange={(e) => {
                    setForm({ ...form, contactId: e.target.value });
                    setErrors((cur) => ({ ...cur, contactId: undefined }));
                  }}
                  className={`${inputClass}${errors.contactId ? " border-red-500" : ""}`}
                >
                  <option value="">{editingId && !form.contactId ? calls.find((c) => c.id === editingId)?.contactName || "Select contact" : "Select contact"}</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{contactFullName(c)}</option>
                  ))}
                </select>
                {errors.contactId && <p className="mt-1 text-xs text-red-600">{errors.contactId}</p>}
              </div>

              {/* Related to */}
              <div>
                <label htmlFor="call-account" className={labelClass}>Related to</label>
                <input id="call-account" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="Search account" className={inputClass} />
              </div>

              {/* Call type */}
              <div>
                <label htmlFor="call-type" className={labelClass}>Call type</label>
                <select
                  id="call-type"
                  value={isSchedule ? "Outbound" : form.callType}
                  disabled={isSchedule}
                  onChange={(e) => setForm({ ...form, callType: e.target.value as CallType })}
                  className={inputClass}
                >
                  {callTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Outgoing call status */}
              <div>
                <label htmlFor="call-status" className={labelClass}>Outgoing call status</label>
                {isSchedule ? (
                  <select id="call-status" value="Scheduled" disabled className={inputClass}>
                    <option>Scheduled</option>
                  </select>
                ) : (
                  <select
                    id="call-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as CallStatus })}
                    className={inputClass}
                  >
                    {loggedStatuses.map((s) => <option key={s}>{s}</option>)}
                  </select>
                )}
              </div>

              {/* Call start time */}
              <div>
                <label htmlFor="call-start" className={labelClass}>Call start time </label>
                <input
                  id="call-start"
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => {
                    setForm({ ...form, startTime: e.target.value });
                    setErrors((cur) => ({ ...cur, startTime: undefined }));
                  }}
                  className={`${inputClass}${errors.startTime ? " border-red-500" : ""}`}
                />
                {errors.startTime && <p className="mt-1 text-xs text-red-600">{errors.startTime}</p>}
              </div>

              {/* Duration (log) / Subject (schedule) */}
              {!isSchedule ? (
                <div>
                  <label className={labelClass}>
                    Call duration
                  </label>
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label="Minutes"
                      placeholder="00"
                      value={form.minutes}
                      disabled={form.callType === "Missed"}
                      onChange={(e) => {
                        setForm({ ...form, minutes: e.target.value });
                        setErrors((cur) => ({ ...cur, duration: undefined }));
                      }}
                      className={`${inputClass} w-20!${errors.duration ? " border-red-500" : ""}`}
                    />
                    minutes
                    <input
                      type="number"
                      min={0}
                      max={59}
                      inputMode="numeric"
                      aria-label="Seconds"
                      placeholder="00"
                      value={form.seconds}
                      disabled={form.callType === "Missed"}
                      onChange={(e) => {
                        setForm({ ...form, seconds: e.target.value });
                        setErrors((cur) => ({ ...cur, duration: undefined }));
                      }}
                      className={`${inputClass} w-20!${errors.duration ? " border-red-500" : ""}`}
                    />
                    seconds
                  </div>
                  {errors.duration && <p className="mt-1 text-xs text-red-600">{errors.duration}</p>}
                </div>
              ) : (
                <div>
                  <label htmlFor="call-subject" className={labelClass}>Subject</label>
                  <input
                    id="call-subject"
                    value={subjectValue}
                    onChange={(e) => setForm({ ...form, subject: e.target.value, subjectEdited: true })}
                    className={inputClass}
                  />
                </div>
              )}

              {/* Subject (log) + Voice recording */}
              {!isSchedule && (
                <>
                  <div>
                    <label htmlFor="call-subject" className={labelClass}>Subject</label>
                    <input
                      id="call-subject"
                      value={subjectValue}
                      onChange={(e) => setForm({ ...form, subject: e.target.value, subjectEdited: true })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="call-recording" className={labelClass}>Voice recording</label>
                    <input
                      id="call-recording"
                      type="url"
                      value={form.voiceRecording}
                      onChange={(e) => setForm({ ...form, voiceRecording: e.target.value })}
                      placeholder="Recording link"
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {/* Reminder (schedule only) */}
              {isSchedule && (
                <div>
                  <label htmlFor="call-reminder" className={labelClass}>Reminder</label>
                  <select id="call-reminder" value={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.value })} className={inputClass}>
                    {reminders.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Purpose of outgoing call */}
            {isOutbound && (
              <>
                <h4 className="pt-2 text-sm font-semibold text-gray-800 dark:text-white/90">Purpose of outgoing call</h4>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label htmlFor="call-purpose" className={labelClass}>Call purpose</label>
                    <select id="call-purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={inputClass}>
                      {purposes.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="call-agenda" className={labelClass}>Call agenda</label>
                    <input id="call-agenda" value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} placeholder="Enter agenda" className={inputClass} />
                  </div>
                </div>
              </>
            )}
          </div>
        </form>
      )}

      {/* ---------------- DELETE CONFIRM ---------------- */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Confirm delete</h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">This will permanently remove this call.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300">Cancel</button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}