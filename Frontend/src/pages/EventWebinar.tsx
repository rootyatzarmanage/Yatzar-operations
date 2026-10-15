import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

type EventStatus = "Planning" | "Active" | "Complete";

type EventType = "Webinar" | "Event" | "Workshop";

type EventWebinar = {
  id: number;
  name: string;
  type: EventType;
  schedule: string;
  duration: string;
  status: EventStatus;
  owner: string;
  expectedRevenue: string;
  budgetedCost: string;
  actualCost: string;
  description: string;
};

type EventForm = {
  name: string;
  schedule: string;
  duration: string;
  owner: string;
  type: EventType;
  status: EventStatus | "";
  expectedRevenue: string;
  budgetedCost: string;
  actualCost: string;
  description: string;
};

const emptyForm: EventForm = {
  name: "",
  schedule: "",
  duration: "",
  owner: "superadmin",
  type: "Webinar",
  status: "",
  expectedRevenue: "",
  budgetedCost: "",
  actualCost: "",
  description: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:focus:border-brand-500 dark:focus:bg-white/[0.05]";

const labelClass =
  "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

const thClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

function getStatusClass(status: EventStatus) {
  switch (status) {
    case "Planning":
      return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400";

    case "Active":
      return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400";

    case "Complete":
      return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400";

    default:
      return "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400";
  }
}

export default function EventWebinar() {
  const [events, setEvents] = useState<EventWebinar[]>([]);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<EventForm>(emptyForm);

  const [search, setSearch] = useState("");

  const [entriesPerPage, setEntriesPerPage] = useState(5);

  const [page, setPage] = useState(1);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return events;
    }

    return events.filter((event) =>
      [
        event.name,
        event.type,
        event.schedule,
        event.duration,
        event.status,
        event.owner,
        event.expectedRevenue,
        event.budgetedCost,
        event.actualCost,
      ].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [events, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEvents.length / entriesPerPage),
  );

  const currentPage = Math.min(page, totalPages);

  const startIndex = (currentPage - 1) * entriesPerPage;

  const visibleEvents = filteredEvents.slice(
    startIndex,
    startIndex + entriesPerPage,
  );

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (event: EventWebinar) => {
    setEditingId(event.id);

    setForm({
      name: event.name,
      schedule: event.schedule,
      duration: event.duration,
      owner: event.owner,
      type: event.type,
      status: event.status,
      expectedRevenue: event.expectedRevenue,
      budgetedCost: event.budgetedCost,
      actualCost: event.actualCost,
      description: event.description,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newEvent: EventWebinar = {
      id: editingId ?? Date.now(),
      name: form.name,
      type: form.type,
      schedule: form.schedule,
      duration: form.duration,
      status: form.status || "Planning",
      owner: form.owner,
      expectedRevenue: form.expectedRevenue,
      budgetedCost: form.budgetedCost,
      actualCost: form.actualCost,
      description: form.description,
    };

    if (editingId !== null) {
      setEvents((current) =>
        current.map((event) =>
          event.id === editingId ? newEvent : event,
        ),
      );
    } else {
      setEvents((current) => [newEvent, ...current]);
    }

    setPage(1);
    closeForm();
  };

  const handleDelete = (id: number) => {
    setEvents((current) =>
      current.filter((event) => event.id !== id),
    );
  };

  if (showForm) {
    return (
      <EventForm
        form={form}
        editingId={editingId}
        onChange={handleChange}
        onCancel={closeForm}
        onSave={handleSave}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Event webinar
          </h1>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Home</span>

          <ChevronRight size={14} />

          <span>Marketing</span>

          <ChevronRight size={14} />

          <span className="text-gray-800 dark:text-white/90">
            Event webinar
          </span>
        </div>
      </div>

      {/* MAIN CARD */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
        {/* CARD HEADER */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Event webinar
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Schedule events and webinars.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <Plus size={17} />
            Add event
          </button>
        </div>

        {/* SEARCH + ENTRIES */}
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />

            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search events"
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90 dark:placeholder:text-gray-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            Show

            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 outline-none dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
            >
              {[5, 10, 25, 50].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>

            entries
          </label>
        </div>

        {/* TABLE */}
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[1200px] text-start">
            <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                <th className="w-12 px-5 py-3">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand-500"
                    aria-label="Select all events"
                  />
                </th>

                <th className={thClass}>CAMPAIGN NAME</th>

                <th className={thClass}>TYPE</th>

                <th className={thClass}>WEBINAR SCHEDULE</th>

                <th className={thClass}>DURATION</th>

                <th className={thClass}>STATUS</th>

                <th className={thClass}>CAMPAIGN OWNER</th>

                <th className={thClass}>EXPECTED REVENUE</th>

                <th className={thClass}>BUDGETED COST</th>

                <th className={thClass}>ACTUAL COST</th>

                <th className={thClass}>ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibleEvents.map((event) => (
                <tr
                  key={event.id}
                  className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-500"
                      aria-label={`Select ${event.name}`}
                    />
                  </td>

                  <td className="px-3 py-4 sm:px-5">
                    <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {event.name}
                    </span>
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {event.type}
                  </td>

                  <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-600 sm:px-5 dark:text-gray-300">
                    {event.schedule || "—"}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {event.duration || "—"}
                  </td>

                  <td className="px-3 py-4 sm:px-5">
                    {event.status && (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          event.status,
                        )}`}
                      >
                        {event.status}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {event.owner || "—"}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {event.expectedRevenue
                      ? `Rs. ${event.expectedRevenue}`
                      : "Rs. 0"}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {event.budgetedCost
                      ? `Rs. ${event.budgetedCost}`
                      : "Rs. 0"}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {event.actualCost
                      ? `Rs. ${event.actualCost}`
                      : "Rs. 0"}
                  </td>

                  <td className="px-3 py-4 sm:px-5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(event)}
                        title="Edit"
                        aria-label="Edit event"
                        className="rounded-md p-1.5 text-brand-500 transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(event.id)}
                        title="Delete"
                        aria-label="Delete event"
                        className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* EMPTY STATE */}
        {filteredEvents.length === 0 && (
          <div className="mx-5 my-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
            {events.length === 0
              ? "No events yet. Click Add event to create one."
              : "No events match your search."}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex items-center justify-between border-t border-gray-200 p-4 text-sm text-gray-500 sm:p-5 dark:border-gray-800 dark:text-gray-400">
          <span>
            Showing{" "}
            <b className="text-gray-800 dark:text-white/90">
              {filteredEvents.length}
            </b>{" "}
            events
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:hover:bg-white/[0.03]"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            {filteredEvents.length > 0 && (
              <button
                type="button"
                className="h-9 min-w-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white"
              >
                {currentPage}
              </button>
            )}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:hover:bg-white/[0.03]"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ADD / EDIT FORM                                                            */
/* -------------------------------------------------------------------------- */

type EventFormProps = {
  form: EventForm;
  editingId: number | null;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  onCancel: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
};

function EventForm({
  form,
  editingId,
  onChange,
  onCancel,
  onSave,
}: EventFormProps) {
  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Event webinar
          </h1>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Home</span>

          <ChevronRight size={14} />

          <span>Marketing</span>

          <ChevronRight size={14} />

          <span className="text-gray-800 dark:text-white/90">
            Event webinar
          </span>
        </div>
      </div>

      {/* FORM CARD */}
      <form
        onSubmit={onSave}
        className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark"
      >
        {/* FORM HEADER */}
        <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {editingId !== null ? "Edit event" : "Add event"}
          </h2>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Save
            </button>
          </div>
        </div>

        <div className="space-y-7 p-5 sm:p-6">
          {/* WEBINAR DETAILS */}
          <section>
            <h3 className="mb-5 text-sm font-semibold text-gray-800 dark:text-white/90">
              Webinar details
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              {/* SCHEDULE */}
              <div>
                <label
                  htmlFor="schedule"
                  className={labelClass}
                >
                  Webinar schedule
                </label>

                <input
                  id="schedule"
                  name="schedule"
                  type="datetime-local"
                  value={form.schedule}
                  onChange={onChange}
                  className={inputClass}
                />
              </div>

              {/* DURATION */}
              <div>
                <label
                  htmlFor="duration"
                  className={labelClass}
                >
                  Webinar duration
                </label>

                <select
                  id="duration"
                  name="duration"
                  value={form.duration}
                  onChange={onChange}
                  className={inputClass}
                >
                  <option value="">-None-</option>
                  <option value="45 minutes">45 minutes</option>
                  <option value="1 hour">1 hour</option>
                  <option value="1.5 hours">1.5 hours</option>
                  <option value="2 hours">2 hours</option>
                  <option value="3 hours">3 hours</option>
                </select>
              </div>
            </div>
          </section>

          {/* CAMPAIGN INFORMATION */}
          <section>
            <h3 className="mb-5 text-sm font-semibold text-gray-800 dark:text-white/90">
              Campaign information
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              {/* OWNER */}
              <div>
                <label
                  htmlFor="owner"
                  className={labelClass}
                >
                  Campaign owner
                </label>

                <select
                  id="owner"
                  name="owner"
                  value={form.owner}
                  onChange={onChange}
                  className={inputClass}
                >
                  <option value="superadmin">
                    superadmin
                  </option>
                </select>
              </div>

              {/* TYPE */}
              <div>
                <label
                  htmlFor="type"
                  className={labelClass}
                >
                  Type
                </label>

                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={onChange}
                  className={inputClass}
                >
                  <option value="Webinar">Webinar</option>
                  <option value="Event">Event</option>
                  <option value="Workshop">Workshop</option>
                </select>
              </div>

              {/* CAMPAIGN NAME */}
              <div>
                <label
                  htmlFor="name"
                  className={labelClass}
                >
                  Campaign name
                </label>

                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Enter campaign name"
                  className={inputClass}
                />
              </div>

              {/* STATUS */}
              <div>
                <label
                  htmlFor="status"
                  className={labelClass}
                >
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  className={inputClass}
                >
                  <option value="">-None-</option>
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>

              {/* EXPECTED REVENUE */}
              <div>
                <label
                  htmlFor="expectedRevenue"
                  className={labelClass}
                >
                  Expected revenue (Rs.)
                </label>

                <input
                  id="expectedRevenue"
                  name="expectedRevenue"
                  type="number"
                  min="0"
                  value={form.expectedRevenue}
                  onChange={onChange}
                  className={inputClass}
                />
              </div>

              {/* BUDGETED COST */}
              <div>
                <label
                  htmlFor="budgetedCost"
                  className={labelClass}
                >
                  Budgeted cost (Rs.)
                </label>

                <input
                  id="budgetedCost"
                  name="budgetedCost"
                  type="number"
                  min="0"
                  value={form.budgetedCost}
                  onChange={onChange}
                  className={inputClass}
                />
              </div>

              {/* ACTUAL COST */}
              <div>
                <label
                  htmlFor="actualCost"
                  className={labelClass}
                >
                  Actual cost (Rs.)
                </label>

                <input
                  id="actualCost"
                  name="actualCost"
                  type="number"
                  min="0"
                  value={form.actualCost}
                  onChange={onChange}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* DESCRIPTION */}
          <section>
            <h3 className="mb-5 text-sm font-semibold text-gray-800 dark:text-white/90">
              Description information
            </h3>

            <div>
              <label
                htmlFor="description"
                className={labelClass}
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={onChange}
                placeholder="Enter description"
                className={`${inputClass} min-h-28 resize-none`}
              />
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}