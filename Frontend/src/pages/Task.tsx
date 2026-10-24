import { listContacts, type Contact } from "@/api/contacts";
import { listLeads, type LeadRecord } from "@/api/leads";
import { listCustomers, type CustomerRecord } from "@/api/customers";
import { createTask, deleteTask, listTasks, updateTask, type TaskApi, type TaskPayload } from "@/api/task";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { hasPermission, useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { EmbedProps } from "@/components/records/embed";
import WorkspaceAssigneeField, { useWorkspaceMembers } from "@/components/activities/WorkspaceAssigneeField";

type TaskStatus = "Not Started" | "Deferred" | "In Progress" | "Waiting for input" | "Completed";
type TaskPriority = "Highest" | "High" | "Normal" | "Low" | "Lowest";
type ContactMode = "name" | "tag";
type ParticipantType = "contact" | "lead" | "customer";
type Participant = { id: string; type: ParticipantType; name: string; email: string };

const participantSourceLabels: Record<ParticipantType, string> = {
  contact: "Contact",
  lead: "Lead",
  customer: "Customer",
};

type Task = {
  id: string;
  subject: string;
  dueDate: string; // yyyy-mm-dd
  status: TaskStatus;
  priority: TaskPriority;
  account: string;
  owner: string;
  assignedToId: string;
  assignedTo: string;
  contactMode: ContactMode;
  tagId: string;
  contactIds: string[];
  contactLabel: string; // text shown in the table
  reminder: boolean;
  reminderDate: string;
  reminderTime: string;
  reminderNotify: string;
  repeat: boolean;
  description: string;
};

const statuses: TaskStatus[] = ["Not Started", "Deferred", "In Progress", "Waiting for input", "Completed"];
const priorities: TaskPriority[] = ["Highest", "High", "Normal", "Low", "Lowest"];

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90";
const labelClass = "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";
const thClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

const statusBadge: Record<TaskStatus, string> = {
  "Not Started": "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
  Deferred: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  "In Progress": "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  "Waiting for input": "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
  Completed: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
};

const emptyForm = {
  taskOwner: "",
  subject: "",
  dueDate: "",
  status: "Not Started" as TaskStatus,
  priority: "High" as TaskPriority,
  account: "",
  contactMode: "name" as ContactMode,
  tagId: "",
  contactIds: [] as string[],
  reminder: false,
  reminderDate: "",
  reminderTime: "",
  reminderNotify: "Email",
  repeat: false,
  description: "",
  assignedTo: "",
};

function formatDate(value: string) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}
function formatTime(value: string) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}
function contactFullName(c: Contact) {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

export default function Tasks({ embed }: EmbedProps = {}) {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "Tasks", "create");
  const canUpdate = hasPermission(user, "Tasks", "update");
  const canDelete = hasPermission(user, "Tasks", "delete");
  const { currentWorkspace } = useWorkspace();
  const workspaceMembers = useWorkspaceMembers();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<{ subject?: string }>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerSource, setPickerSource] = useState<ParticipantType>("contact");
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [apiError, setApiError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const taskOwner = user?.display_name || user?.employee_name || user?.username || "";

  useEffect(() => {
    setTasks([]);
    setContacts([]);
    setLeads([]);
    setCustomers([]);
    void listContacts()
      .then(setContacts)
      .catch((error: unknown) => setApiError(error instanceof Error ? error.message : "Unable to load contacts."));
    void listLeads()
      .then(setLeads)
      .catch((error: unknown) => setApiError(error instanceof Error ? error.message : "Unable to load leads."));
    void listCustomers()
      .then(setCustomers)
      .catch((error: unknown) => setApiError(error instanceof Error ? error.message : "Unable to load customers."));
    void listTasks()
      .then((result) => setTasks(result.map((task) => fromApiTask(task, taskOwner))))
      .catch((error: unknown) => setApiError(error instanceof Error ? error.message : "Unable to load tasks."));
  }, [currentWorkspace?.id, taskOwner, workspaceMembers]);

  const participants = useMemo<Participant[]>(() => [
    ...contacts.map((contact) => ({
      id: contact.id,
      type: "contact" as const,
      name: contactFullName(contact) || contact.email || "Unnamed",
      email: contact.email ?? "",
    })),
    ...leads.map((lead) => ({
      id: lead.id,
      type: "lead" as const,
      name: `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || String(lead.email ?? "") || "Unnamed",
      email: String(lead.email ?? ""),
    })),
    ...customers.map((customer) => ({
      id: customer.id,
      type: "customer" as const,
      name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || String(customer.email ?? "") || "Unnamed",
      email: String(customer.email ?? ""),
    })),
  ], [contacts, leads, customers]);

  const selectionLabel = (_mode: ContactMode, ids: string[]) =>
    participants.filter((person) => ids.includes(person.id)).map((person) => person.name).join(", ");

  const toTaskPayload = (values: typeof emptyForm): TaskPayload => {
    return {
      subject: values.subject.trim(),
      due_date: values.dueDate || null,
      contact_selection: {
        selection_type: "name",
        tag_id: null,
        contact_ids: values.contactIds,
      },
      account: values.account.trim() || null,
      status: values.status,
      priority: values.priority,
      reminder_enabled: values.reminder,
      reminder_at: values.reminder && values.reminderDate && values.reminderTime
        ? `${values.reminderDate}T${values.reminderTime}:00`
        : null,
      reminder_type: values.reminder ? values.reminderNotify : null,
      repeat_enabled: values.reminder && values.repeat,
      description: values.description.trim() || null,
      assigned_to: values.assignedTo || null,
    };
  };

  function fromApiTask(task: TaskApi, owner: string): Task {
    return {
      id: task.id,
      subject: task.subject,
      dueDate: task.due_date ?? "",
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      account: task.account ?? "",
      owner: workspaceMembers.find((member) => member.id === task.task_owner_id)?.name ?? (task.task_owner_id === user?.id ? owner : task.task_owner_id ? "Unknown user" : ""),
      assignedToId: task.assigned_to ?? "",
      assignedTo: workspaceMembers.find((member) => member.id === task.assigned_to)?.name ?? (task.assigned_to === user?.id ? taskOwner : ""),
      contactMode: task.contact_selection.selection_type,
      tagId: task.contact_selection.tag_id ?? "",
      contactIds: task.contact_selection.contact_ids,
      contactLabel: "",
      reminder: task.reminder_enabled,
      reminderDate: task.reminder_at?.slice(0, 10) ?? "",
      reminderTime: task.reminder_at?.slice(11, 16) ?? "",
      reminderNotify: task.reminder_type ?? "Email",
      repeat: task.repeat_enabled,
      description: task.description ?? "",
    };
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) =>
      [t.subject, t.account, selectionLabel(t.contactMode, t.contactIds), t.owner, t.assignedTo, t.status, t.priority].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [participants, searchTerm, tasks]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * entriesPerPage;
  const visible = filtered.slice(start, start + entriesPerPage);
  const visibleIds = visible.map((task) => task.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const bulkDelete = async () => {
    if (!canDelete || !selectedIds.length || !window.confirm(`Delete ${selectedIds.length} tasks?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteTask(id)));
      setTasks((current) => current.filter((task) => !selectedIds.includes(task.id)));
      setSelectedIds([]);
    } catch (error: unknown) {
      setApiError(error instanceof Error ? error.message : "Unable to delete tasks.");
    }
  };

  const openAdd = () => {
    if (!canCreate) return;
    setEditingId(null);
    setForm({ ...emptyForm, taskOwner, assignedTo: user?.id ?? "" });
    setErrors({});
    setPickerOpen(false);
    setReminderOpen(false);
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    if (!canUpdate) return;
    setEditingId(task.id);
    setForm({
      taskOwner: task.owner,
      subject: task.subject,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      account: task.account,
      contactMode: task.contactMode,
      contactIds: task.contactIds,
      reminder: task.reminder,
      reminderDate: task.reminderDate,
      reminderTime: task.reminderTime,
      reminderNotify: task.reminderNotify,
      repeat: task.repeat,
      description: task.description,
      tagId: task.tagId,
      assignedTo: task.assignedToId,
    });
    setErrors({});
    setPickerOpen(false);
    setReminderOpen(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setPickerOpen(false);
    setReminderOpen(false);
    embed?.onClose();
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (editingId ? !canUpdate : !canCreate) return;
    if (!form.subject.trim()) {
      setErrors({ subject: "Subject is required." });
      return;
    }

    try {
      setApiError("");
      const saved = editingId
        ? await updateTask(editingId, toTaskPayload(form))
        : await createTask(toTaskPayload(form));
      const task = fromApiTask(saved, taskOwner);
      setTasks((current) =>
        editingId ? current.map((item) => (item.id === editingId ? task : item)) : [task, ...current],
      );
      setPage(1);
      closeForm();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to save task.");
    }
  };

  const markComplete = async (id: string) => {
    if (!canUpdate) return;
    try {
      const updated = await updateTask(id, { status: "Completed" });
      setTasks((current) => current.map((task) => (task.id === id ? fromApiTask(updated, taskOwner) : task)));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to complete task.");
    }
  };

  const confirmDelete = async () => {
    if (!canDelete || !deleteId) return;
    try {
      await deleteTask(deleteId);
      setTasks((current) => current.filter((task) => task.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to delete task.");
    }
  };

  const togglePicked = (id: string) =>
    setPickerSelection((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );

  const pickerItems = participants.filter((person) => person.type === pickerSource);
  const visiblePickerItems = pickerItems.filter((item) => {
    const query = pickerSearch.trim().toLowerCase();
    return !query || item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query);
  });
  const allPickerItemsSelected =
    visiblePickerItems.length > 0 &&
    visiblePickerItems.every((item) => pickerSelection.includes(item.id));
  const toggleAllPickerItems = () =>
    setPickerSelection((current) => {
      if (allPickerItemsSelected) {
        return current.filter((id) => !visiblePickerItems.some((item) => item.id === id));
      }
      return [...new Set([...current, ...visiblePickerItems.map((item) => item.id)])];
    });
  const openContactPicker = () => {
    setPickerSelection(form.contactIds);
    setPickerSource("contact");
    setPickerSearch("");
    setPickerOpen(true);
  };
  const applyContactPicker = () => {
    setForm((current) => ({ ...current, contactMode: "name", tagId: "", contactIds: pickerSelection }));
    setPickerOpen(false);
  };

  const embedInit = useRef(false);
  useEffect(() => {
    if (!embed || embedInit.current) return;
    if (!embed.editId) {
      embedInit.current = true;
      openAdd();
      return;
    }
    const target = tasks.find((x) => x.id === embed.editId);
    if (target) {
      embedInit.current = true;
      openEdit(target);
    }
  });

  return (
    <>
      {!embed && <PageMeta title="Task | Yatzar Operations" description="Yatzar Operations tasks" />}
      {!embed && <PageBreadcrumb pageTitle="Task" parent={{ label: "Activities" }} />}
      {apiError && (
        <div role="alert" className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          {apiError}
        </div>
      )}

      {!showForm && !embed && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Task information</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Track and manage tasks in one place.
              </p>
            </div>
            {canCreate && <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              <span className="text-lg leading-none">+</span>Create Task
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
              placeholder="Search tasks"
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

          {canDelete && selectedIds.length > 0 && (
            <div className="flex items-center justify-between border-b border-gray-200 bg-blue-50 px-5 py-3 text-sm dark:border-gray-800 dark:bg-white/5">
              <span>{selectedIds.length} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-transparent">Clear selection</button>
                <button type="button" onClick={() => void bulkDelete()} className="rounded-lg bg-red-600 px-3 py-2 font-medium text-white">Delete {selectedIds.length}</button>
              </div>
            </div>
          )}

          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[900px] text-start">
              <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                <tr>
                  {canDelete && <th className="w-12 px-5 py-3"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds((current) => allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])])} className="size-4 accent-brand-500" aria-label="Select all" /></th>}
                  <th className={thClass}>Subject</th>
                  <th className={thClass}>Due date</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Priority</th>
                  <th className={thClass}>Related to</th>
                  <th className={thClass}>Contact name</th>
                  <th className={thClass}>Task owner</th>
                  <th className={thClass}>Assigned to</th>
                  {(canUpdate || canDelete) && <th className={`${thClass} text-center`}>Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map((task) => (
                  <tr key={task.id} className="transition hover:bg-gray-50 dark:hover:bg-white/2">
                    {canDelete && <td className="px-5 py-4"><input type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => setSelectedIds((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])} className="size-4 accent-brand-500" aria-label={`Select ${task.subject}`} /></td>}
                    <td className="px-3 py-4 text-sm font-medium text-gray-800 sm:px-5 dark:text-white/90">{task.subject}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{formatDate(task.dueDate)}</td>
                    <td className="px-3 py-4 sm:px-5">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${statusBadge[task.status]}`}>{task.status}</span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{task.priority}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{task.account || "—"}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                      {selectionLabel(task.contactMode, task.contactIds) || "—"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{task.owner}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">{task.assignedTo || "—"}</td>
                    {(canUpdate || canDelete) && <td className="px-3 py-4 sm:px-5">
                      <div className="flex items-center justify-left gap-1">
                        {canUpdate && task.status !== "Completed" && (
                          <button type="button" onClick={() => markComplete(task.id)} title="Mark complete" aria-label="Mark complete" className="rounded-md p-1.5 text-success-600 hover:bg-success-50">
                            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>
                          </button>
                        )}
                        {canUpdate && <button type="button" onClick={() => openEdit(task)} title="Edit" aria-label="Edit" className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50">
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m13.5 6.5 4 4" /></svg>
                        </button>}
                        {canDelete && <button type="button" onClick={() => setDeleteId(task.id)} title="Delete" aria-label="Delete" className="rounded-md p-1.5 text-error-500 hover:bg-error-50">
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M7 7l1 12h8l1-12" /><path d="M10 11v5M14 11v5" /></svg>
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
              {tasks.length === 0 ? "No tasks yet. Select Create Task to add one." : "No tasks match your search."}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-200 p-4 text-sm text-gray-500 sm:p-5 dark:border-gray-800 dark:text-gray-400">
            <span>Total Records <b className="text-gray-800 dark:text-white/90">{filtered.length}</b></span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="size-9 rounded-lg border border-gray-200 disabled:opacity-40 dark:border-gray-800">‹</button>
              <span>{filtered.length === 0 ? 0 : start + 1} to {Math.min(start + entriesPerPage, filtered.length)}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="size-9 rounded-lg border border-gray-200 disabled:opacity-40 dark:border-gray-800">›</button>
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
              {editingId ? "Edit task" : "Add task"}
            </h3>
            <div className="flex gap-3">
              <button type="button" onClick={closeForm} className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300">
                ← Back to table
              </button>
              {(editingId ? canUpdate : canCreate) && <button type="submit" className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600">
                Save task
              </button>}
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Task information</h4>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="task-owner" className={labelClass}>Task owner</label>
                <input id="task-owner" value={form.taskOwner} readOnly className={`${inputClass} cursor-not-allowed`} />
              </div>
              <WorkspaceAssigneeField
                id="task-assigned-to"
                value={form.assignedTo}
                members={workspaceMembers}
                onChange={(assignedTo) => setForm((current) => ({ ...current, assignedTo }))}
              />
              <div>
                <label htmlFor="task-subject" className={labelClass}>Subject</label>
                <input
                  id="task-subject"
                  value={form.subject}
                  onChange={(e) => {
                    setForm({ ...form, subject: e.target.value });
                    setErrors({});
                  }}
                  placeholder="Enter subject"
                  className={`${inputClass}${errors.subject ? " border-red-500" : ""}`}
                />
                {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject}</p>}
              </div>
              <div>
                <label htmlFor="task-due" className={labelClass}>Due date</label>
                <input id="task-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Participants</label>
              <div className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-800">
                <div className="flex flex-wrap gap-1.5">
                  {form.contactIds.length === 0 && <span className="text-gray-400">None</span>}
                  {form.contactIds.map((id) => {
                    const person = participants.find((item) => item.id === id);
                    return (
                      <span key={id} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                        {person?.name ?? id}
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={openContactPicker}
                  className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                  Select
                </button>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="task-account" className={labelClass}>Account</label>
                <input id="task-account" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="Search account" className={inputClass} />
              </div>
              <div>
                <label htmlFor="task-status" className={labelClass}>Status</label>
                <select id="task-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} className={inputClass}>
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="task-priority" className={labelClass}>Priority</label>
                <select id="task-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} className={inputClass}>
                  {priorities.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className={labelClass}>Reminder</label>
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={form.reminder}
                    onChange={(v) => {
                      setForm({
                        ...form,
                        reminder: v,
                        repeat: v ? form.repeat : false,
                        reminderDate: v ? new Date().toISOString().slice(0, 10) : "",
                        reminderTime: v ? new Date().toTimeString().slice(0, 5) : "",
                      });
                      setReminderOpen(v);
                    }}
                  />
                  {form.reminder && !reminderOpen && (
                    <button
                      type="button"
                      onClick={() => setReminderOpen(true)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      title="Edit reminder"
                    >
                      On {formatDate(form.reminderDate)} at {formatTime(form.reminderTime)} · {form.reminderNotify}
                    </button>
                  )}
                </div>
                {reminderOpen && (
                  <div className="absolute left-0 top-full z-20 mt-3 w-[26rem] max-w-[90vw] space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-dark">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      On
                      <input type="date" value={form.reminderDate} onChange={(e) => setForm({ ...form, reminderDate: e.target.value })} className={inputClass} />
                      at
                      <input type="time" value={form.reminderTime} onChange={(e) => setForm({ ...form, reminderTime: e.target.value })} className={inputClass} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-700">
                      Notify
                      <select value={form.reminderNotify} onChange={(e) => setForm({ ...form, reminderNotify: e.target.value })} className={inputClass}>
                        <option>Email</option>
                        <option>Popup</option>
                        <option>Email and Popup</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => { setReminderOpen(false); setForm({ ...form, reminder: false, repeat: false }); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700">Cancel</button>
                      <button type="button" onClick={() => setReminderOpen(false)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Done</button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Repeat</label>
                <Toggle
                  checked={form.repeat}
                  disabled={!form.reminder}
                  onChange={(v) => setForm({ ...form, repeat: v })}
                />
              </div>
            </div>

            <h4 className="pt-2 text-sm font-semibold text-gray-800 dark:text-white/90">Description information</h4>
            <div>
              <label htmlFor="task-description" className={labelClass}>Description</label>
              <textarea id="task-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Enter description" className={inputClass} />
            </div>
          </div>
        </form>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-contact-picker-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl dark:bg-gray-dark"
          >
            <div className="border-b border-gray-200 p-6 dark:border-gray-800">
              <h3 id="task-contact-picker-title" className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Select participants
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose from contacts, leads and customers. Your selections are kept when you switch the list.
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="flex gap-3">
                <select
                  value={pickerSource}
                  onChange={(event) => setPickerSource(event.target.value as ParticipantType)}
                  className={`${inputClass} !w-40`}
                >
                  {(Object.keys(participantSourceLabels) as ParticipantType[]).map((source) => (
                    <option key={source} value={source}>{participantSourceLabels[source]}</option>
                  ))}
                </select>
                <input
                  type="search"
                  value={pickerSearch}
                  onChange={(event) => setPickerSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className={inputClass}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allPickerItemsSelected}
                    onChange={toggleAllPickerItems}
                    className="size-4 accent-brand-500"
                  />
                  Select all in this list
                </label>
                <span className="text-gray-500">{pickerSelection.length} selected</span>
              </div>
              <div className="custom-scrollbar max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {visiblePickerItems.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">Nothing to select.</p>
                ) : (
                  visiblePickerItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={pickerSelection.includes(item.id)}
                        onChange={() => togglePicked(item.id)}
                        className="size-4 accent-brand-500"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</span>
                        {item.email && <span className="block text-xs text-gray-500">{item.email}</span>}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {pickerSelection.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-gray-500">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {pickerSelection.map((id) => {
                      const person = participants.find((item) => item.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          {person?.name ?? id}{" "}
                          <span className="text-gray-400">({person ? participantSourceLabels[person.type] : "Participant"})</span>
                          <button
                            type="button"
                            aria-label={`Remove ${person?.name ?? "participant"}`}
                            onClick={() => togglePicked(id)}
                            className="ms-1 text-gray-500 hover:text-gray-800"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
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
                onClick={applyContactPicker}
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
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Confirm delete</h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">This will permanently remove this task.</p>
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
