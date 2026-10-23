import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import SearchableSelect from "@/components/common/SearchableSelect";
import { listContacts, type Contact } from "@/api/contacts";
import { createTask, listTasks, type TaskApi } from "@/api/task";
import { createMeeting, listMeetings, type MeetingApi } from "@/api/meetings";
import { createCall, listCalls, type CallApi } from "@/api/calls";
import {
  createCalendarEvent, deleteCalendarEvent, downloadCalendarIcs, listCalendarEvents,
  respondCalendarEvent, updateCalendarEvent, type CalendarEventApi,
} from "@/api/calendarEvents";
import Contacts from "@/pages/Contacts";
import Leads from "@/pages/Leads";
import Customers from "@/pages/Customers";
import Tasks from "@/pages/Task";
import Meetings from "@/pages/Meetings";
import Calls from "@/pages/Calls";
import { hasPermission, useAuth } from "@/context/AuthContext";

/* ------------------------------------------------------------------ types */
type View = "day" | "week" | "month" | "year";
type FilterKey = "Event" | "Task" | "Meeting" | "Call";
type FormKind = "contacts" | "leads" | "customers" | "tasks" | "meetings" | "calls";
type ItemKind = "ev" | "ce" | "tasks" | "meetings" | "calls";
type MenuKey = "engagement" | "activities" | "filter" | null;

type LocalEvent = { id: string; title: string; date: string; end?: string; type: string; desc?: string };
type Item = {
  k: ItemKind;
  id: string;
  t: string;
  s: string; // start yyyy-mm-dd
  e: string; // end yyyy-mm-dd
  y: string; // type label
  tf?: string; // start datetime
  tt?: string; // end datetime
  ad?: boolean; // all day
  du?: number; // duration in minutes
  rm?: number | null; // my reminder lead time in minutes
};
type Timed = Item & { a: number; z: number; c: number; w: number };

type EvForm = {
  editId: string | null;
  type: string;
  title: string;
  from: string;
  to: string;
  ft: string;
  tt: string;
  desc: string;
  contactId: string;
  location: string;
  allDay: boolean;
  guests: string[];
  guestInput: string;
  reminder: string;
  guestsReminder: string;
  sendInvites: boolean;
  repeat: string;
  ce: CalendarEventApi | null;
  errors: {
    title?: boolean;
    from?: boolean;
    to?: boolean;
    fromTime?: boolean;
    toTime?: boolean;
    contact?: boolean;
  };
};

/* -------------------------------------------------------------- constants */
const EVENTS_KEY = "yz_events";
const HOUR_H = 56;
const EVC: Record<string, string> = {
  Contact: "#4361ee",
  Lead: "#f59e0b",
  Customer: "#10b981",
  Task: "#ef4444",
  Meeting: "#8b5cf6",
  Call: "#06b6d4",
  Event: "#64748b",
  Workshop: "#ec4899",
  Holiday: "#f97316",
};
const colorOf = (y: string) => EVC[y] || "#4361ee";

const btnPrimary =
  "flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700";
const iconBtn =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";
const menuBox =
  "absolute top-12 z-30 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900";
const menuItem =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800";
const fieldCls =
  "mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-gray-950 dark:text-white";
const bdr = "border-gray-200 dark:border-gray-700";

/* ---------------------------------------------------------------- helpers */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minutesOf = (v: string) => Number(v.slice(11, 13)) * 60 + Number(v.slice(14, 16));
const t12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
};
const fmtMin = (m: number) => t12(`${pad(Math.min(23, Math.floor(m / 60)))}:${pad(m >= 1440 ? 59 : m % 60)}`);
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

function readEvents(): LocalEvent[] {
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LocalEvent[]) : [];
  } catch {
    return [];
  }
}
function writeEvents(list: LocalEvent[]) {
  try {
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

const GUEST_TYPES = ["Event", "Workshop", "Holiday"];
const REMINDERS = ["None", "At time of meeting", "5 minutes before", "10 minutes before", "30 minutes before", "1 hour before", "1 day before"];
const REPEATS = ["None", "Daily", "Weekly", "Monthly", "Yearly"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const localIso = (d: Date) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Expand a (possibly repeating) calendar event into the occurrences visible in [from, to]. */
function expand(e: CalendarEventApi, from: string, to: string): { tf: string; tt: string }[] {
  const st = new Date(e.starts_at);
  const dur = new Date(e.ends_at).getTime() - st.getTime();
  const out: { tf: string; tt: string }[] = [];
  for (let k = 0; k < 800; k++) {
    if (k > 0 && e.repeat_frequency === "None") break;
    const months = e.repeat_frequency === "Yearly" ? 12 * k : e.repeat_frequency === "Monthly" ? k : 0;
    const days = e.repeat_frequency === "Daily" ? k : e.repeat_frequency === "Weekly" ? 7 * k : 0;
    const d = new Date(st.getFullYear(), st.getMonth() + months, 1, st.getHours(), st.getMinutes());
    d.setDate(Math.min(st.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()) + days);
    const end = new Date(d.getTime() + dur);
    if (ymd(d) > to) break;
    if (ymd(end) >= from) out.push({ tf: localIso(d), tt: localIso(end) });
  }
  return out;
}

function Swatch({ color }: { color: string }) {
  return <i className="inline-block h-3 w-3 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/* ------------------------------------------------------------------- page */
export default function Calendar() {
  const { user } = useAuth();
  const canCreateContacts = hasPermission(user, "Contacts", "create");
  const canCreateTasks = hasPermission(user, "Tasks", "create");
  const canCreateMeetings = hasPermission(user, "Meetings", "create");
  const canCreateCalls = hasPermission(user, "Calls", "create");
  const canCreateEvents = hasPermission(user, "Event Webinar", "create");
  const canUpdateEvents = hasPermission(user, "Event Webinar", "update");
  const canDeleteEvents = hasPermission(user, "Event Webinar", "delete");
  const canViewTasks = hasPermission(user, "Tasks", "view");
  const canViewMeetings = hasPermission(user, "Meetings", "view");
  const canViewCalls = hasPermission(user, "Calls", "view");
  const canViewEvents = hasPermission(user, "Event Webinar", "view");
  const [calD, setCalD] = useState(() => new Date());
  const [view, setView] = useState<View>("month");
  const [menu, setMenu] = useState<MenuKey>(null);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({ Event: true, Task: true, Meeting: true, Call: true });
  const [events, setEvents] = useState<LocalEvent[]>(readEvents);
  const [tasks, setTasks] = useState<TaskApi[]>([]);
  const [meetings, setMeetings] = useState<MeetingApi[]>([]);
  const [calEvents, setCalEvents] = useState<CalendarEventApi[]>([]);
  const [calls, setCalls] = useState<CallApi[]>([]);
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState<{ kind: FormKind; editId?: string } | null>(null);
  const [ev, setEv] = useState<EvForm | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dragS, setDragS] = useState<string | null>(null);
  const [dragE, setDragE] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const dragRef = useRef<{ s: string | null; e: string | null }>({ s: null, e: null });
  const menuRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const range = useMemo(() => {
    const y = calD.getFullYear();
    return view === "year"
      ? [`${y}-01-01`, `${y}-12-31`]
      : [ymd(new Date(y, calD.getMonth() - 1, 1)), ymd(new Date(y, calD.getMonth() + 2, 0))];
  }, [calD, view]);

  /* ---- load Tasks / Meetings / Calls from the API (reload after any form closes) */
  useEffect(() => {
    let active = true;
    void listTasks()
      .then((r) => { if (active) setTasks(r); })
      .catch(() => undefined);
    void listMeetings({ page: 1, perPage: 100 })
      .then((r) => { if (active) setMeetings(r.items); })
      .catch(() => undefined);
    void listCalls({ page: 1, perPage: 100 })
      .then((r) => { if (active) setCalls(r.items); })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [tick]);

  /* ---- calendar events (own + invited), re-fetched when the visible range changes */
  useEffect(() => {
    let active = true;
    void listCalendarEvents(range[0], range[1])
      .then((r) => { if (active) setCalEvents(r); })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [tick, range]);

  /* ---- close dropdown menus on outside click */
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  /* ---- all calendar items */
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (canViewEvents) events.forEach((e) => out.push({ k: "ev", id: e.id, t: e.title, s: e.date, e: e.end || e.date, y: e.type }));
    if (canViewMeetings) meetings.forEach((m) => {
      if (!m.starts_at) return;
      out.push({
        k: "meetings",
        id: m.id,
        t: m.title,
        s: m.starts_at.slice(0, 10),
        e: (m.ends_at || m.starts_at).slice(0, 10),
        y: "Meeting",
        tf: m.starts_at,
        tt: m.ends_at,
        ad: m.all_day,
      });
    });
    if (canViewTasks) tasks.forEach((x) => {
      if (!x.due_date) return;
      out.push({ k: "tasks", id: x.id, t: x.subject, s: x.due_date.slice(0, 10), e: x.due_date.slice(0, 10), y: "Task" });
    });
    if (canViewCalls) calls.forEach((c) => {
      if (!c.call_start_time) return;
      out.push({
        k: "calls",
        id: c.id,
        t: c.subject,
        s: c.call_start_time.slice(0, 10),
        e: c.call_start_time.slice(0, 10),
        y: "Call",
        tf: c.call_start_time,
        du: (c.duration_minutes ?? 0) + (c.duration_seconds ?? 0) / 60,
      });
    });
    calEvents.forEach((c) => {
      const rm = c.my_response === "declined" ? null : c.my_reminder_minutes;
      expand(c, range[0], range[1]).forEach((o) =>
        out.push({ k: "ce", id: c.id, t: c.title, s: o.tf.slice(0, 10), e: o.tt.slice(0, 10), y: c.event_type, tf: o.tf, tt: o.tt, ad: c.all_day, rm }),
      );
    });
    return out.filter((i) => filters[(i.k === "ev" || i.k === "ce" ? "Event" : i.y) as FilterKey]);
  }, [events, calEvents, range, tasks, meetings, calls, filters, canViewEvents, canViewTasks, canViewMeetings, canViewCalls]);

  const today = ymd(new Date());

  /* ---- navigation */
  const step = (n: number) => {
    const d = new Date(calD);
    if (view === "day") d.setDate(d.getDate() + n);
    else if (view === "week") d.setDate(d.getDate() + 7 * n);
    else if (view === "year") d.setFullYear(d.getFullYear() + n, d.getMonth(), 1);
    else d.setMonth(d.getMonth() + n, 1);
    setCalD(d);
  };

  const title = useMemo(() => {
    if (view === "year") return String(calD.getFullYear());
    if (view === "day")
      return calD.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (view === "week") {
      const st = new Date(calD);
      st.setDate(st.getDate() - st.getDay());
      const en = new Date(st);
      en.setDate(en.getDate() + 6);
      return `${st.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${en.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return calD.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calD, view]);

  /* ---- day view auto scroll */
  useEffect(() => {
    if (view !== "day" || !dayScrollRef.current) return;
    const h = ymd(calD) === today ? new Date().getHours() : 8;
    dayScrollRef.current.scrollTop = Math.max(0, (h - 1) * HOUR_H);
  }, [view, calD, today]);

  /* ---- filters */
  const filterKeys: FilterKey[] = ["Event", "Task", "Meeting", "Call"];
  const activeFilters = filterKeys.filter((k) => filters[k]).length;
  const allChecked = activeFilters === filterKeys.length;
  const toggleAll = (checked: boolean) => setFilters({ Event: checked, Task: checked, Meeting: checked, Call: checked });

  /* ---- real forms (Engagement / Activities / existing item) */
  const openForm = (kind: FormKind, editId?: string) => {
    setMenu(null);
    setForm({ kind, editId });
  };
  const closeForm = useCallback(() => {
    setForm(null);
    setTick((t) => t + 1);
  }, []);

  const embedCfg = form ? { editId: form.editId, onClose: closeForm } : null;
  let formNode: ReactNode = null;
  if (form && embedCfg) {
    if (form.kind === "contacts") formNode = <Contacts embed={embedCfg} />;
    else if (form.kind === "leads") formNode = <Leads embed={embedCfg} />;
    else if (form.kind === "customers") formNode = <Customers embed={embedCfg} />;
    else if (form.kind === "tasks") formNode = <Tasks embed={embedCfg} />;
    else if (form.kind === "meetings") formNode = <Meetings embed={embedCfg} />;
    else formNode = <Calls embed={embedCfg} />;
  }

  /* ---- quick event modal */
  const evOpen = (id?: string, a?: string, b?: string, ft?: string, tt?: string, ty?: string) => {
    const ce = id ? calEvents.find((c) => c.id === id) : undefined;
    if (!ce && (id ? !canUpdateEvents : (ty === "Meeting" ? !canCreateMeetings : !canCreateEvents))) return;
    const ed = id && !ce ? events.find((e) => e.id === id) : undefined;
    const from = a || today;
    const s = ce ? localIso(new Date(ce.starts_at)) : "";
    const z = ce ? localIso(new Date(ce.ends_at)) : "";
    setEv({
      editId: ce ? ce.id : ed ? ed.id : null,
      type: ce ? ce.event_type : ed ? ed.type : ty || "Event",
      title: ce ? ce.title : ed ? ed.title : "",
      from: ce ? s.slice(0, 10) : ed ? ed.date : from,
      to: ce ? z.slice(0, 10) : ed ? ed.end || ed.date : b || from,
      ft: ce && !ce.all_day ? s.slice(11) : ft || "09:00",
      tt: ce && !ce.all_day ? z.slice(11) : tt || "10:00",
      desc: ce ? ce.description || "" : ed?.desc || "",
      contactId: "",
      location: ce?.location || "",
      allDay: ce ? ce.all_day : true,
      guests: ce ? ce.guests.filter((g) => !g.is_organizer).map((g) => g.email) : [],
      guestInput: "",
      reminder: ce ? ce.reminder : "10 minutes before",
      guestsReminder: ce ? ce.guests_reminder : "10 minutes before",
      sendInvites: true,
      repeat: ce ? ce.repeat_frequency : "None",
      ce: ce ?? null,
      errors: {},
    });
    if (!contacts.length) void listContacts().then(setContacts).catch(() => undefined);
  };
  const clearSel = () => {
    dragRef.current = { s: null, e: null };
    setDragS(null);
    setDragE(null);
  };
  const evClose = () => {
    setEv(null);
    clearSel();
  };
  const evPatch = (p: Partial<EvForm>) => setEv((cur) => (cur ? { ...cur, ...p } : cur));

  const evDelete = async () => {
    if (ev?.ce) {
      if (!ev.ce.is_organizer || !window.confirm("Delete this event? Guests will get a cancellation email.")) return;
      try {
        await deleteCalendarEvent(ev.ce.id);
        setTick((n) => n + 1);
        evClose();
        showToast("Event deleted");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Unable to delete event.");
      }
      return;
    }
    if (!canDeleteEvents || !ev?.editId || !window.confirm("Delete this event?")) return;
    const next = events.filter((e) => e.id !== ev.editId);
    setEvents(next);
    writeEvents(next);
    evClose();
    showToast("Event deleted");
  };

  const addGuests = () => {
    if (!ev) return;
    const parts = ev.guestInput.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (parts.length) evPatch({ guests: [...new Set([...ev.guests, ...parts])], guestInput: "" });
  };

  const evRespond = async (answer: "accepted" | "declined" | "maybe") => {
    if (!ev?.ce) return;
    try {
      await respondCalendarEvent(ev.ce.id, answer);
      setTick((n) => n + 1);
      evClose();
      showToast("Response saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save response.");
    }
  };

  const saveCalendarEvent = async () => {
    if (!ev) return;
    const title = ev.title.trim();
    const typed = ev.guestInput.split(/[,;\s]+/).filter(Boolean);
    const guests = [...new Set([...ev.guests, ...typed].map((g) => g.trim().toLowerCase()))];
    const badEmail = guests.some((g) => !EMAIL_RE.test(g));
    if (!title || !ev.from || !ev.to || badEmail) {
      evPatch({ errors: { title: !title, from: !ev.from, to: !ev.to } });
      return showToast(badEmail ? "One of the guest emails is not valid" : "Title and dates are required");
    }
    if (ev.to < ev.from || (!ev.allDay && ev.to === ev.from && ev.tt <= ev.ft)) return showToast("End must be after the start");
    if (!ev.ce && !canCreateEvents) return;
    const payload = {
      title,
      event_type: ev.type,
      location: ev.location.trim() || null,
      description: ev.desc.trim() || null,
      all_day: ev.allDay,
      starts_at: `${ev.from}T${ev.allDay ? "00:00" : ev.ft}`,
      ends_at: `${ev.to}T${ev.allDay ? "23:59" : ev.tt}`,
      repeat_frequency: ev.repeat,
      reminder: ev.reminder,
      guests_reminder: ev.guestsReminder,
      guests: guests.map((email) => ({ email })),
      send_invites: ev.sendInvites,
    };
    try {
      setSaving(true);
      if (ev.ce) await updateCalendarEvent(ev.ce.id, payload);
      else await createCalendarEvent(payload);
      setTick((n) => n + 1);
      evClose();
      showToast(guests.length && ev.sendInvites ? `Saved. Invitations sent to ${guests.length} guest(s)` : "Event saved");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save event.");
    } finally {
      setSaving(false);
    }
  };

  const evSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ev || saving) return;
    if (GUEST_TYPES.includes(ev.type) && (!ev.editId || ev.ce)) return saveCalendarEvent();
    const allowed = ev.editId
      ? (ev.type === "Meeting" ? hasPermission(user, "Meetings", "update") : canUpdateEvents)
      : ev.type === "Task"
        ? canCreateTasks
        : ev.type === "Meeting"
          ? canCreateMeetings
          : ev.type === "Call"
            ? canCreateCalls
            : canCreateEvents;
    if (!allowed) return;
    const t = ev.title.trim();
    const y = ev.type;
    if (!t || !ev.from || !ev.to) {
      evPatch({ errors: { title: !t, from: !ev.from, to: !ev.to } });
      return showToast("Title and dates are required");
    }
    if (ev.to < ev.from) {
      evPatch({ errors: { to: true } });
      return showToast("To date must be on or after From date");
    }
    if (y === "Meeting" && ev.to === ev.from && ev.tt <= ev.ft) return showToast("End time must be after start time");
    if (y === "Call" && !ev.contactId) {
      evPatch({ errors: { contact: true } });
      return showToast("Select a contact for the call");
    }
    const desc = ev.desc.trim();
    const existing = ev.editId ? events.find((x) => x.id === ev.editId) : undefined;
    const keep = !!existing && (y === existing.type || y === "Event" || y === "Workshop");
    try {
      setSaving(true);
      let list = events;
      if (existing && !keep) list = list.filter((x) => x.id !== existing.id);
      if (keep && existing) {
        list = list.map((x) => (x.id === existing.id ? { ...x, title: t, date: ev.from, end: ev.to, desc, type: y } : x));
      } else if (y === "Task") {
        await createTask({ subject: t, due_date: ev.to, status: "Not Started", priority: "High", description: desc || null });
      } else if (y === "Meeting") {
        await createMeeting({
          title: t,
          venue: "Client location",
          starts_at: `${ev.from}T${ev.ft}`,
          ends_at: `${ev.to}T${ev.tt}`,
          description: desc || null,
        });
      } else if (y === "Call") {
        await createCall({
          contact_id: ev.contactId,
          subject: t,
          call_type: "Outbound",
          call_status: "Scheduled",
          call_start_time: `${ev.from}T${ev.ft}`,
          call_agenda: desc || null,
        });
      } else {
        list = [...list, { id: String(Date.now()), title: t, date: ev.from, end: ev.to, type: y, desc }];
      }
      if (list !== events) {
        setEvents(list);
        writeEvents(list);
      }
      if (y === "Task" || y === "Meeting" || y === "Call") setTick((n) => n + 1);
      evClose();
      showToast(`${y} ${keep ? "updated" : existing ? "converted" : "added"}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : `Unable to save ${y.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  /* ---- drag across dates to create */
  const onGridDown = (e: React.PointerEvent) => {
    if (e.button || (e.target as HTMLElement).closest("[data-ev]")) return;
    const c = (e.target as HTMLElement).closest<HTMLElement>("[data-d]");
    if (!c) return;
    const d = c.dataset.d as string;
    dragRef.current = { s: d, e: d };
    setDragS(d);
    setDragE(d);
  };
  const onGridMove = (e: React.PointerEvent) => {
    if (!dragRef.current.s) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const c = el?.closest<HTMLElement>("[data-d]");
    if (c && c.dataset.d && c.dataset.d !== dragRef.current.e) {
      dragRef.current.e = c.dataset.d;
      setDragE(c.dataset.d);
    }
  };
  useEffect(() => {
    const up = () => {
      const { s, e } = dragRef.current;
      if (!s || !e) return;
      const a = s < e ? s : e;
      const b = s < e ? e : s;
      dragRef.current = { s: null, e: null };
      evOpen(undefined, a, b);
    };
    const cancel = () => clearSel();
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", cancel);
    return () => {
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, contacts.length]);

  const selA = dragS && dragE ? (dragS < dragE ? dragS : dragE) : "";
  const selB = dragS && dragE ? (dragS < dragE ? dragE : dragS) : "";

  /* ---- Escape key */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (form) {
        if (hostRef.current && hostRef.current.querySelectorAll(".fixed").length === 0) closeForm();
      } else if (ev) {
        setEv(null);
        clearSel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [form, ev, closeForm]);

  /* ---- in-app reminder popup (like Google Calendar) */
  const shownReminders = useRef(new Set<string>());
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      items.forEach((it) => {
        if (it.k !== "ce" || !it.tf || it.rm == null) return;
        const start = new Date(it.tf).getTime();
        const key = `${it.id}:${it.tf}`;
        if (start - it.rm * 60000 <= now && now < start && !shownReminders.current.has(key)) {
          shownReminders.current.add(key);
          const msg = `Reminder: ${it.t} starts at ${fmtMin(minutesOf(it.tf))}`;
          showToast(msg);
          if ("Notification" in window && Notification.permission === "granted") new Notification(msg);
        }
      });
    };
    if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
    check();
    const timer = window.setInterval(check, 30000);
    return () => window.clearInterval(timer);
  }, [items, showToast]);

  /* ---- click handlers for items */
  const openItem = (it: Item) => {
    if (it.k === "ev" || it.k === "ce") evOpen(it.id);
    else openForm(it.k === "tasks" ? "tasks" : it.k === "meetings" ? "meetings" : "calls", it.id);
  };

  const chip = (it: Item) => (
    <div
      key={`${it.k}:${it.id}`}
      data-ev=""
      title={it.y}
      onClick={(e) => { e.stopPropagation(); openItem(it); }}
      className="mt-1 cursor-pointer truncate rounded-md border-l-4 px-2 py-1 text-xs text-gray-800 dark:text-gray-100"
      style={{ borderColor: colorOf(it.y), background: `${colorOf(it.y)}1a` }}
    >
      {it.t || "(no title)"}
    </div>
  );

  /* ------------------------------------------------------------ view bodies */
  const yearBody = () => {
    const y = calD.getFullYear();
    return Array.from({ length: 12 }, (_, m) => {
      const f = new Date(y, m, 1);
      const n = new Date(y, m + 1, 0).getDate();
      return (
        <div key={m} className={`rounded-xl border p-4 ${bdr}`}>
          <button
            type="button"
            className="mb-3 text-sm font-semibold hover:text-brand-500 dark:text-white"
            onClick={() => { setCalD(new Date(y, m, 1)); setView("month"); }}
          >
            {f.toLocaleDateString("en-US", { month: "long" })}
          </button>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-gray-400">
            {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={i}>{x}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: f.getDay() }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: n }, (_, i) => {
              const d = i + 1;
              const k = ymd(new Date(y, m, d));
              const has = items.some((e) => e.s <= k && k <= e.e);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setCalD(new Date(`${k}T00:00`)); setView("day"); }}
                  className={`h-8 rounded-md text-xs hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 ${
                    k === today ? "bg-brand-500 text-white hover:!bg-brand-500" : has ? "bg-blue-50 font-semibold text-brand-500 dark:bg-gray-700" : ""
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      );
    });
  };

  const dayBody = () => {
    const k = ymd(calD);
    const allDay: Item[] = [];
    const tm: Timed[] = [];
    items
      .filter((e) => e.s <= k && k <= e.e)
      .forEach((e) => {
        if (e.tf && !e.ad) {
          const a = e.tf.slice(0, 10) === k ? minutesOf(e.tf) : 0;
          let z = e.tt ? (e.tt.slice(0, 10) === k ? minutesOf(e.tt) : 1440) : Math.min(1440, minutesOf(e.tf) + (e.du || 30));
          if (z <= a) z = Math.min(1440, a + 30);
          tm.push({ ...e, a, z, c: 0, w: 1 });
        } else allDay.push(e);
      });
    tm.sort((x, y) => x.a - y.a || y.z - x.z);
    let end = 0;
    let grp: Timed[] = [];
    const groups: Timed[][] = [];
    tm.forEach((x) => {
      if (!grp.length || x.a >= end) { grp = []; groups.push(grp); end = 0; }
      grp.push(x);
      end = Math.max(end, x.z);
    });
    groups.forEach((g) => {
      const cols: number[] = [];
      g.forEach((x) => {
        let i = cols.findIndex((z) => z <= x.a);
        if (i < 0) { i = cols.length; cols.push(0); }
        cols[i] = x.z;
        x.c = i;
      });
      g.forEach((x) => { x.w = cols.length; });
    });
    const now = new Date();
    const slotClick = (h: number | null) => {
      if (h === null) return evOpen(undefined, k, k);
      evOpen(undefined, k, k, `${pad(h)}:00`, h > 22 ? "23:59" : `${pad(h + 1)}:00`, "Meeting");
    };
    return (
      <>
        <div className={`flex border-b ${bdr}`}>
          <div className={`w-16 shrink-0 border-r ${bdr}`} />
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-gray-500">{calD.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</div>
            <div className={`text-2xl font-semibold ${k === today ? "text-brand-500" : "dark:text-white"}`}>{calD.getDate()}</div>
          </div>
        </div>
        <div className={`flex border-b ${bdr}`}>
          <div className={`w-16 shrink-0 border-r px-2 py-3 text-right text-[11px] text-gray-500 ${bdr}`}>All day</div>
          <div onClick={() => slotClick(null)} className="min-h-[48px] flex-1 cursor-pointer px-2 pb-2 hover:bg-gray-50 dark:hover:bg-gray-800/40">
            {allDay.map((it) => chip(it))}
          </div>
        </div>
        <div ref={dayScrollRef} className="flex max-h-[620px] overflow-y-auto">
          <div className={`w-16 shrink-0 border-r ${bdr}`}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="h-14 pr-2 text-right text-[11px] text-gray-500">
                <span className="relative -top-2">{h ? hourLabel(h) : ""}</span>
              </div>
            ))}
          </div>
          <div className="relative flex-1">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} onClick={() => slotClick(h)} className={`h-14 cursor-pointer border-b hover:bg-gray-50 dark:hover:bg-gray-800/40 ${bdr}`} />
            ))}
            {tm.map((x) => (
              <div
                key={`${x.k}:${x.id}`}
                data-ev=""
                title={x.y}
                onClick={(e) => { e.stopPropagation(); openItem(x); }}
                className="absolute z-10 cursor-pointer overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs text-gray-800 dark:text-gray-100"
                style={{
                  top: (x.a / 60) * HOUR_H,
                  height: Math.max(((x.z - x.a) / 60) * HOUR_H, 22) - 2,
                  left: `calc(${(x.c * 100) / x.w}% + 2px)`,
                  width: `calc(${100 / x.w}% - 4px)`,
                  borderColor: colorOf(x.y),
                  background: `${colorOf(x.y)}26`,
                }}
              >
                <b className="block truncate">{x.t || "(no title)"}</b>
                <span className="block truncate text-gray-500 dark:text-gray-300">{fmtMin(x.a)} – {fmtMin(x.z)}</span>
              </div>
            ))}
            {k === today && (
              <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H }}>
                <span className="absolute -left-1.5 -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="border-t-2 border-red-500" />
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const gridBody = () => {
    let st: Date;
    let cnt: number;
    if (view === "week") {
      st = new Date(calD);
      st.setDate(st.getDate() - st.getDay());
      cnt = 7;
    } else {
      const f = new Date(calD.getFullYear(), calD.getMonth(), 1);
      st = new Date(f);
      st.setDate(1 - f.getDay());
      cnt = 42;
    }
    return Array.from({ length: cnt }, (_, i) => {
      const d = new Date(st);
      d.setDate(st.getDate() + i);
      const k = ymd(d);
      const out = view === "month" && d.getMonth() !== calD.getMonth();
      const sel = !!selA && k >= selA && k <= selB;
      return (
        <div
          key={k}
          data-d={k}
          className={`cursor-pointer border-b border-r p-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 ${bdr} ${view === "week" ? "min-h-[260px]" : "min-h-[110px]"} ${sel ? "!bg-indigo-500/15 shadow-[inset_0_0_0_1px_#4361ee]" : ""}`}
        >
          <div className={`text-right text-sm ${out ? "text-gray-400" : "text-gray-800 dark:text-gray-200"} ${k === today ? "font-semibold !text-brand-500" : ""}`}>{d.getDate()}</div>
          {items.filter((e) => e.s <= k && k <= e.e).map((it) => chip(it))}
        </div>
      );
    });
  };

  const gridCls =
    view === "year" ? "grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4"
    : view === "day" ? "grid grid-cols-1" : "grid grid-cols-7";

  /* ----------------------------------------------------------------- render */
  const guestType = ev ? GUEST_TYPES.includes(ev.type) : false;
  const timesVisible = ev ? ev.type === "Meeting" || ev.type === "Call" || (guestType && !ev.allDay) : false;
  const ro = !!ev && !!ev.ce && !ev.ce.is_organizer;
  const errCls = (b?: boolean) => (b ? "border-red-500" : "border-gray-200 dark:border-gray-700");

  return (
    <>
      <PageMeta title="Calendar | Yatzar Operations" description="Calendar for managing engagement and activities" />
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5">
          <PageBreadCrumb pageTitle="Calendar" />
        </div>

        <section className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div ref={menuRef} className="flex flex-wrap items-center gap-2">
              <button type="button" aria-label="Previous" onClick={() => step(-1)} className={iconBtn}><ChevronLeft size={17} /></button>
              <button type="button" aria-label="Next" onClick={() => step(1)} className={iconBtn}><ChevronRight size={17} /></button>

              {(canCreateContacts) && <div className="relative">
                <button type="button" onClick={() => setMenu(menu === "engagement" ? null : "engagement")} className={btnPrimary}><Plus size={15} /> Engagement <ChevronDown size={14} /></button>
                {menu === "engagement" && (
                  <div className={`${menuBox} left-0 w-44 p-1`}>
                    <button type="button" className={menuItem} onClick={() => openForm("contacts")}><Swatch color={EVC.Contact} />Add Contact</button>
                    {canCreateContacts && <button type="button" className={menuItem} onClick={() => openForm("leads")}><Swatch color={EVC.Lead} />Add Leads</button>}
                    {canCreateContacts && <button type="button" className={menuItem} onClick={() => openForm("customers")}><Swatch color={EVC.Customer} />Add Customer</button>}
                  </div>
                )}
              </div>}

              {(canCreateTasks || canCreateMeetings || canCreateCalls) && <div className="relative">
                <button type="button" onClick={() => setMenu(menu === "activities" ? null : "activities")} className={btnPrimary}><Plus size={15} /> Activities <ChevronDown size={14} /></button>
                {menu === "activities" && (
                  <div className={`${menuBox} left-0 w-44 p-1`}>
                    {canCreateTasks && <button type="button" className={menuItem} onClick={() => openForm("tasks")}><Swatch color={EVC.Task} />Add Task</button>}
                    {canCreateMeetings && <button type="button" className={menuItem} onClick={() => openForm("meetings")}><Swatch color={EVC.Meeting} />Add Meetings</button>}
                    {canCreateCalls && <button type="button" className={menuItem} onClick={() => openForm("calls")}><Swatch color={EVC.Call} />Add Calls</button>}
                  </div>
                )}
              </div>}

              <div className="relative">
                <button type="button" onClick={() => setMenu(menu === "filter" ? null : "filter")} className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                  <Filter size={14} /> Filter
                  {!allChecked && <span className="min-w-[18px] rounded-full bg-brand-500 px-1 text-center text-[11px] leading-[18px] text-white">{activeFilters}</span>}
                  <ChevronDown size={14} />
                </button>
                {menu === "filter" && (
                  <div className={`${menuBox} left-0 w-52 p-2`}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = activeFilters > 0 && !allChecked; }}
                        onChange={(e) => toggleAll(e.target.checked)}
                        className="h-4 w-4 accent-brand-500"
                      />
                      <span className="font-medium">All</span>
                    </label>
                    <div className={`my-1 border-t ${bdr}`} />
                    {([["Event", "Events", EVC.Event], ["Task", "Tasks", EVC.Task], ["Meeting", "Meetings", EVC.Meeting], ["Call", "Calls", EVC.Call]] as [FilterKey, string, string][]).map(([key, label, color]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                        <input type="checkbox" checked={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.checked }))} className="h-4 w-4 accent-brand-500" />
                        <Swatch color={color} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>

            <SearchableSelect
              size="sm"
              value={view}
              onChange={(val) => setView(val as View)}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
                { value: "year", label: "Year" },
              ]}
              className="h-10 w-28 bg-white dark:bg-gray-900"
            />
          </div>

          {(view === "week" || view === "month") && (
            <div className="grid grid-cols-7 border-y border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800/60">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => <div key={d} className="py-4">{d}</div>)}
            </div>
          )}

          <div
            className={`${gridCls} select-none`}
            onPointerDown={view === "month" || view === "week" ? onGridDown : undefined}
            onPointerMove={view === "month" || view === "week" ? onGridMove : undefined}
          >
            {view === "year" ? yearBody() : view === "day" ? dayBody() : gridBody()}
          </div>
        </section>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <CalendarDays className="mr-1 inline" size={13} /> Drag across dates to add an event. Click an item to edit it.
        </p>
      </div>

      {/* ---------------- quick "Add to calendar" modal ---------------- */}
      {ev && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/50 p-4">
          <form onSubmit={(e) => void evSubmit(e)} noValidate className="my-4 w-full max-w-lg space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{ro ? "Event details" : ev.editId ? "Edit event" : "Add to calendar"}</h2>
            <fieldset disabled={ro} className="m-0 min-w-0 space-y-4 border-0 p-0">
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Type
                  <SearchableSelect
                    value={ev.type}
                    onChange={(val) => evPatch({ type: val })}
                    options={["Event", "Workshop", "Holiday", "Task", "Meeting", "Call"]}
                    className={`${fieldCls} ${errCls()}`}
                  />
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Title{(guestType || ev.type === "Task" || ev.type === "Meeting" || ev.type === "Call") && <span className="text-red-500"> *</span>}
                  <input autoFocus value={ev.title} onChange={(e) => evPatch({ title: e.target.value, errors: { ...ev.errors, title: false } })} placeholder="e.g. Diwali Holiday" className={`${fieldCls} ${errCls(ev.errors.title)}`} />
                </label>
              </div>
              {guestType && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input type="checkbox" checked={ev.allDay} onChange={(e) => evPatch({ allDay: e.target.checked })} className="h-4 w-4 accent-brand-500" /> All day
                </label>
              )}
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">From date{(guestType || ev.type === "Meeting" || ev.type === "Call") && <span className="text-red-500"> *</span>}
                  <input type="date" value={ev.from} onChange={(e) => evPatch({ from: e.target.value, errors: { ...ev.errors, from: false } })} className={`${fieldCls} ${errCls(ev.errors.from)}`} />
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">To date{(guestType || ev.type === "Meeting") && <span className="text-red-500"> *</span>}
                  <input type="date" value={ev.to} onChange={(e) => evPatch({ to: e.target.value, errors: { ...ev.errors, to: false } })} className={`${fieldCls} ${errCls(ev.errors.to)}`} />
                </label>
              </div>
              {timesVisible && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">From time<span className="text-red-500"> *</span>
                    <input type="time" value={ev.ft} onChange={(e) => evPatch({ ft: e.target.value, errors: { ...ev.errors, fromTime: false } })} className={`${fieldCls} ${errCls(ev.errors.fromTime)}`} />
                  </label>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">To time<span className="text-red-500"> *</span>
                    <input type="time" value={ev.tt} onChange={(e) => evPatch({ tt: e.target.value, errors: { ...ev.errors, toTime: false } })} className={`${fieldCls} ${errCls(ev.errors.toTime)}`} />
                  </label>
                </div>
              )}
              {ev.type === "Call" && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Contact<span className="text-red-500"> *</span>
                  <SearchableSelect
                    value={ev.contactId}
                    onChange={(val) => evPatch({ contactId: val, errors: { ...ev.errors, contact: false } })}
                    placeholder="Select contact"
                    hasError={Boolean(ev.errors.contact)}
                    options={[
                      { value: "", label: "Select contact" },
                      ...contacts.map((c) => ({
                        value: c.id,
                        label: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || "Unnamed",
                      })),
                    ]}
                    className={`${fieldCls} ${errCls(ev.errors.contact)}`}
                  />
                </label>
              )}
              {guestType && (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Location
                    <input value={ev.location} onChange={(e) => evPatch({ location: e.target.value })} placeholder="Add location or meeting link" className={`${fieldCls} ${errCls()}`} />
                  </label>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Guests
                    <div className={`mt-1 flex flex-wrap gap-1.5 rounded-lg border p-2 ${bdr}`}>
                      {ev.guests.map((g) => {
                        const st = ev.ce?.guests.find((x) => x.email === g)?.response;
                        return (
                          <span key={g} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${EMAIL_RE.test(g) ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200" : "bg-red-50 text-red-600"}`}>
                            {st === "accepted" ? "✓ " : st === "declined" ? "✗ " : st === "maybe" ? "? " : ""}{g}
                            {!ro && <button type="button" aria-label={`Remove ${g}`} onClick={() => evPatch({ guests: ev.guests.filter((x) => x !== g) })}>×</button>}
                          </span>
                        );
                      })}
                      {!ro && (
                        <input
                          list="guest-emails"
                          value={ev.guestInput}
                          placeholder="Add guest emails"
                          onChange={(e) => evPatch({ guestInput: e.target.value })}
                          onKeyDown={(e) => { if (["Enter", ",", " ", ";"].includes(e.key)) { e.preventDefault(); addGuests(); } }}
                          onBlur={addGuests}
                          className="min-w-[160px] flex-1 bg-transparent text-sm outline-none dark:text-white"
                        />
                      )}
                    </div>
                    <datalist id="guest-emails">
                      {contacts.filter((c) => c.email).map((c) => <option key={c.id} value={c.email ?? ""} />)}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Repeat
                      <SearchableSelect
                        value={ev.repeat}
                        onChange={(val) => evPatch({ repeat: val })}
                        options={REPEATS}
                        className={`${fieldCls} ${errCls()}`}
                      />
                    </label>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">My reminder
                      <SearchableSelect
                        value={ev.reminder}
                        onChange={(val) => evPatch({ reminder: val })}
                        options={REMINDERS}
                        className={`${fieldCls} ${errCls()}`}
                      />
                    </label>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Guests reminder
                      <SearchableSelect
                        value={ev.guestsReminder}
                        onChange={(val) => evPatch({ guestsReminder: val })}
                        options={REMINDERS}
                        className={`${fieldCls} ${errCls()}`}
                      />
                    </label>
                  </div>
                </>
              )}
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Description
                <textarea rows={3} value={ev.desc} onChange={(e) => evPatch({ desc: e.target.value })} placeholder="Enter details" className={`${fieldCls} ${errCls()}`} />
              </label>
            </fieldset>

            {guestType && !ro && (ev.guests.length > 0 || ev.guestInput.trim() !== "") && (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={ev.sendInvites} onChange={(e) => evPatch({ sendInvites: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                Send invitation emails to guests
              </label>
            )}

            {ev.ce && !ev.ce.is_organizer && (
              <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${bdr}`}>
                <span className="text-sm text-gray-700 dark:text-gray-200">Going?</span>
                <span className="flex gap-2">
                  {([["accepted", "Yes"], ["declined", "No"], ["maybe", "Maybe"]] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => void evRespond(val)}
                      className={`rounded-full border px-4 py-1 text-sm ${ev.ce?.my_response === val ? "border-indigo-600 bg-indigo-600 text-white" : "border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200"}`}>
                      {label}
                    </button>
                  ))}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {ev.editId && (!ev.ce || ev.ce.is_organizer) && <button type="button" onClick={() => void evDelete()} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-gray-800">Delete</button>}
              {ev.ce && <button type="button" onClick={() => { if (ev.ce) void downloadCalendarIcs(ev.ce.id); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Download .ics</button>}
              <span className="ml-auto flex gap-3">
                <button type="button" onClick={evClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">{ro ? "Close" : "Cancel"}</button>
                {!ro && <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{guestType && ev.sendInvites && (ev.guests.length > 0 || ev.guestInput.trim() !== "") ? "Send" : "Save"}</button>}
              </span>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- real page forms (Contact, Lead, Customer, Task, Meeting, Call) ---------------- */}
      {form && (
        <div ref={hostRef} className="fixed inset-0 z-[45] overflow-y-auto bg-gray-900/50 p-4">
          <div className="mx-auto my-4 max-w-5xl">{formNode}</div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[100000] rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg dark:bg-white dark:text-gray-900">{toast}</div>
      )}
    </>
  );
}
