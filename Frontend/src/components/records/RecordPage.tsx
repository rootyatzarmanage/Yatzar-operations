import type { RecordValues, StoredRecord } from "@/storage/localStore";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import RecordView from "@/components/records/RecordView";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { EmbedConfig } from "@/components/records/embed";
import { useWorkspace } from "@/context/WorkspaceContext";
import { hasPermission, useAuth } from "@/context/AuthContext";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "select" | "textarea" | "checkbox" | "purchased-products";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  maxDigits?: number;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
};

export type FormSection = {
  title: string;
  subtitle?: string;
  fields: FieldDef[];
};

export type Column<T> = { header: string; render: (record: T) => ReactNode };

export type RecordStore<T extends StoredRecord> = {
  list: () => T[] | Promise<T[]>;
  create: (values: RecordValues) => T | Promise<T>;
  update: (id: string, values: RecordValues) => T | Promise<T>;
  remove: (id: string) => void | Promise<void>;
};

export type RecordMove<T> = {
  label: string;
  tone: "amber" | "emerald";
  confirm: (name: string) => string;
  done: (name: string) => string;
  run: (record: T) => Promise<unknown>;
};
export type FilterDef<T> = { label: string; get: (record: T) => string };
export type SortDef<T> = { label: string; get: (record: T) => string };

const toneClass = {
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
};

type PurchasedProductValue = {
  name: string;
  quantity: number;
  purchased_on: string;
};

function readPurchasedProducts(value: string): PurchasedProductValue[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "",
        quantity: typeof item.quantity === "number" && item.quantity >= 1 ? item.quantity : 1,
        purchased_on: typeof item.purchased_on === "string" ? item.purchased_on : "",
      }));
  } catch {
    return [];
  }
}
const toolBtn =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5";

type Props<T extends StoredRecord> = {
  permissionMenu: string;
  moves?: RecordMove<T>[];
  filters?: FilterDef<T>[];
  sorts?: SortDef<T>[];
  viewBadge?: (record: T) => string;
  embed?: EmbedConfig;
  pageTitle: string;
  parent?: {
    label: string;
    to?: string;
  };
  heading: string;
  subtitle: string;
  singular: string;
  plural: string;
  addLabel: string;
  searchPlaceholder: string;
  sections: FormSection[];
  columns: Column<T>[];
  searchText: (record: T) => string[];
  recordName: (record: T) => string;
  store: RecordStore<T>;
  showExport?: boolean;
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 transition outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800";
const headerClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCoordinate(
  min: number,
  max: number,
  label: string,
): (value: string) => string | undefined {
  return (value) => {
    if (!value.trim()) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) {
      return `Enter a valid ${label.toLowerCase()} from ${min} to ${max}.`;
    }
    return undefined;
  };
}

export default function RecordPage<T extends StoredRecord>({
  permissionMenu,
  pageTitle,
  parent,
  heading,
  subtitle,
  singular,
  plural,
  addLabel,
  searchPlaceholder,
  sections,
  columns,
  searchText,
  recordName,
  store,
  showExport = true,
  moves = [],
  filters = [],
  sorts = [],
  viewBadge,
  embed,
}: Props<T>) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const canCreate = hasPermission(user, permissionMenu, "create");
  const canUpdate = hasPermission(user, permissionMenu, "update");
  const canDelete = hasPermission(user, permissionMenu, "delete");
  const allFields = useMemo(
    () => sections.flatMap((section) => section.fields),
    [sections],
  );
  const defaults = useMemo<RecordValues>(
    () =>
      Object.fromEntries(
        allFields.map((field) => [
          field.key,
          field.type === "checkbox" ? false : (field.defaultValue ?? ""),
        ]),
      ),
    [allFields],
  );

  const [records, setRecords] = useState<T[]>([]);
  const [pageError, setPageError] = useState("");
  const [, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [values, setValues] = useState<RecordValues>(defaults);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ record: T; move: RecordMove<T> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"filter" | "sort" | null>(null);
  const [filterValues, setFilterValues] = useState<Record<number, string>>({});
  const [sortState, setSortState] = useState<{ i: number; dir: "asc" | "desc" } | null>(null);
  const canSave = editingId ? canUpdate : canCreate;

  useEffect(() => {
    let active = true;
    setRecords([]);
    setSelectedIds([]);
    setLoading(true);
    void Promise.resolve(store.list())
      .then((items) => {
        if (active) setRecords(items);
      })
      .catch((error: unknown) => {
        if (active) setPageError(error instanceof Error ? error.message : `Unable to load ${plural}.`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentWorkspace?.id, plural, store]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let list = records.filter(
      (record) =>
        (!query || searchText(record).some((value) => value.toLowerCase().includes(query))) &&
        filters.every((f, i) => !filterValues[i] || f.get(record) === filterValues[i]),
    );
    if (sortState && sorts[sortState.i]) {
      const get = sorts[sortState.i].get;
      const dir = sortState.dir === "desc" ? -1 : 1;
      list = [...list].sort(
        (a, b) => get(a).localeCompare(get(b), undefined, { numeric: true }) * dir,
      );
    }
    return list;
  }, [records, searchTerm, searchText, filters, filterValues, sorts, sortState]);
  const viewRecord = records.find((record) => record.id === viewId) ?? null;
  const filterCount = Object.values(filterValues).filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / entriesPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const visible = filtered.slice(startIndex, startIndex + entriesPerPage);
  const allPageSelected =
    visible.length > 0 && visible.every((record) => selectedIds.includes(record.id));
  const selectedCount = selectedIds.filter((id) =>
    records.some((record) => record.id === id),
  ).length;
  const recordToDelete = records.find((record) => record.id === deleteId) ?? null;

  const openAdd = () => {
    if (!canCreate) return;
    setViewing(false);
    setNotice("");
    setPageError("");
    setEditingId(null);
    setValues({ ...defaults });
    setErrors({});
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (record: T) => {
    if (!canUpdate) return;
    setViewing(false);
    setNotice("");
    setPageError("");
    setEditingId(record.id);
    setValues(
      Object.fromEntries(
        allFields.map((field) => [
          field.key,
          record[field.key] ?? defaults[field.key],
        ]),
      ),
    );
    setErrors({});
    setFormError("");
    setShowForm(true);
  };

  const openView = (record: T) => {
    setNotice("");
    setViewId(record.id);
  };

  const cleanValues = (): RecordValues =>
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );

  const runMove = async (record: T, move: RecordMove<T>) => {
    if (!canUpdate) return;
    setBusy(true);
    try {
      await move.run(record);
      setRecords((current) => current.filter((r) => r.id !== record.id));
      setSelectedIds((current) => current.filter((id) => id !== record.id));
      setViewId(null);
      setPageError("");
      setNotice(move.done(recordName(record)));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to move this record.");
    } finally {
      setBusy(false);
      setMoveTarget(null);
    }
  };

  const saveAndMove = async (move: RecordMove<T>) => {
    if (editingId ? !canUpdate : !canCreate) return;
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.values(found).some(Boolean)) return;
    setBusy(true);
    try {
      const cleaned = cleanValues();
      const saved = editingId ? await store.update(editingId, cleaned) : await store.create(cleaned);
      await move.run(saved as T);
      setRecords((current) => current.filter((r) => r.id !== saved.id));
      setNotice(move.done(recordName(saved as T)));
      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save and move.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      allFields.map((f) => q(f.label)).join(","),
      ...filtered.map((r) => allFields.map((f) => q(r[f.key])).join(",")),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    a.download = `${plural}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice(`Exported ${filtered.length} ${plural}.`);
  };

  const bulkDelete = async () => {
    if (!canDelete) return;
    const ids = selectedIds.filter((id) => records.some((r) => r.id === id));
    if (!ids.length || !window.confirm(`Delete ${ids.length} selected ${plural}? This cannot be undone.`)) return;
    try {
      for (const id of ids) await store.remove(id);
      setRecords((current) => current.filter((r) => !ids.includes(r.id)));
      setSelectedIds([]);
      setNotice(`${ids.length} ${plural} deleted.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to delete selected records.");
    }
  };

  const viewBlocks = (record: T) =>
    sections.map((section) => ({
      title: section.title,
      subtitle: section.subtitle,
      items: section.fields.map((f) => ({
        label: f.label,
        value: f.type === "checkbox"
          ? (record[f.key] ? "Yes" : "No")
          : f.type === "purchased-products"
            ? readPurchasedProducts(String(record[f.key] ?? "[]"))
                .map((product) => `${product.name || "Unnamed product"} × ${product.quantity}${product.purchased_on ? ` (${product.purchased_on})` : ""}`)
                .join(", ")
            : String(record[f.key] ?? ""),
      })),
    }));

  const moveButtons = (record: T, size: "sm" | "lg") =>
    (canUpdate ? moves : []).map((move) => (
      <button
        key={move.label}
        type="button"
        onClick={() => setMoveTarget({ record, move })}
        className={
          size === "sm"
            ? `rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${toneClass[move.tone]}`
            : `inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium ${toneClass[move.tone]}`
        }
      >
        {move.label}
      </button>
    ));

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setViewing(false);
    setValues({ ...defaults });
    setErrors({});
    setFormError("");
    embed?.onClose();
  };

  const setField = (key: string, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateField = (field: FieldDef, rawValue: string) => {
    const value = rawValue.trim();
    if (field.required && !value) return `${field.label} is required.`;
    if (!value) return undefined;
    if (field.type === "email" && !emailPattern.test(value)) {
      return "Enter a valid email address.";
    }
    if (field.maxDigits && /\D/.test(value)) {
      return `Enter digits only (up to ${field.maxDigits}).`;
    }
    if (field.maxDigits && value.length > field.maxDigits) {
      return `Enter no more than ${field.maxDigits} digits.`;
    }
    if (field.maxLength && value.length > field.maxLength) {
      return `Use ${field.maxLength} characters or fewer.`;
    }
    if (field.minLength && value.length < field.minLength) {
      return `Enter at least ${field.minLength} characters.`;
    }
    return field.validate?.(value);
  };

  const validate = () => {
    const found: Record<string, string | undefined> = {};
    for (const field of allFields) {
      if (field.type === "checkbox") continue;
      const value = String(values[field.key] ?? "").trim();
      found[field.key] = validateField(field, value);
    }
    return found;
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.values(found).some(Boolean)) return;

    const cleaned: RecordValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );
    try {
      if (editingId) {
        const updated = await store.update(editingId, cleaned);
        setRecords((current) =>
          current.map((record) =>
            record.id === updated.id ? (updated as T) : record,
          ),
        );
        setNotice(`${singular} updated in this browser.`);
      } else {
        const created = await store.create(cleaned);
        setRecords((current) => [created, ...current]);
        setPage(1);
        setNotice(`${singular} saved in this browser.`);
      }
      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : `Unable to save this ${singular.toLowerCase()}.`,
      );
    }
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    if (!deleteId) return;
    try {
      await store.remove(deleteId);
      setRecords((current) => current.filter((record) => record.id !== deleteId));
      setSelectedIds((current) => current.filter((id) => id !== deleteId));
      setNotice(`${singular} deleted from this browser.`);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : `Unable to delete this ${singular.toLowerCase()}.`,
      );
    }
    setDeleteId(null);
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visible.some((record) => record.id === id)),
      );
    } else {
      setSelectedIds((current) => [
        ...new Set([...current, ...visible.map((record) => record.id)]),
      ]);
    }
  };

  const renderField = (field: FieldDef) => {
    const id = `${singular}-${field.key}`;
    const error = errors[field.key];
    const errorClass = error ? " border-red-500 focus:border-red-500 focus:ring-red-100" : "";

    if (field.type === "checkbox") {
      return (
        <label key={field.key} className="flex items-center gap-2 self-end pb-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={Boolean(values[field.key])}
            onChange={(event) => setField(field.key, event.target.checked)}
            className="size-4 rounded accent-brand-500"
          />
          {field.label}
        </label>
      );
    }

    const current = String(values[field.key] ?? "");
    if (field.type === "purchased-products") {
      const products = readPurchasedProducts(current);
      const updateProducts = (next: PurchasedProductValue[]) =>
        setField(field.key, JSON.stringify(next));
      return (
        <div key={field.key} className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
          </label>
          <div className="space-y-3">
            {products.map((product, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800 sm:grid-cols-[minmax(0,2fr)_minmax(5rem,0.7fr)_minmax(9rem,1fr)_auto]">
                <input
                  value={product.name}
                  onChange={(event) => updateProducts(products.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}
                  placeholder="Product name"
                  aria-label={`Purchased product ${index + 1} name`}
                  className={inputClass}
                />
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={product.quantity}
                  onChange={(event) => updateProducts(products.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item))}
                  aria-label={`Purchased product ${index + 1} quantity`}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={product.purchased_on}
                  onChange={(event) => updateProducts(products.map((item, itemIndex) => itemIndex === index ? { ...item, purchased_on: event.target.value } : item))}
                  aria-label={`Purchased product ${index + 1} purchase date`}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => updateProducts(products.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                  aria-label={`Remove purchased product ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateProducts([...products, { name: "", quantity: 1, purchased_on: "" }])}
            className="mt-3 inline-flex h-9 items-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
          >
            + Add product
          </button>
        </div>
      );
    }

    let control: ReactNode;
    if (field.type === "select") {
      const options = [...new Set([...(field.options ?? []), current])].filter(Boolean);
      control = (
        <select
          id={id}
          value={current}
          onChange={(event) => setField(field.key, event.target.value)}
          aria-invalid={Boolean(error)}
          className={`${inputClass}${errorClass}`}
        >
          <option value="">{field.placeholder ?? "-None-"}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    } else if (field.type === "textarea") {
      control = (
        <textarea
          id={id}
          rows={4}
          value={current}
          placeholder={field.placeholder}
          onChange={(event) => setField(field.key, event.target.value)}
          onBlur={() => setErrors((currentErrors) => ({
            ...currentErrors,
            [field.key]: validateField(field, String(values[field.key] ?? "")),
          }))}
          className={`${inputClass}${errorClass}`}
        />
      );
    } else {
      control = (
        <input
          id={id}
          type={field.type ?? "text"}
          min={field.type === "number" ? 0 : undefined}
          value={current}
          placeholder={field.placeholder}
          onChange={(event) => setField(field.key, event.target.value)}
          onBlur={() => setErrors((currentErrors) => ({
            ...currentErrors,
            [field.key]: validateField(field, String(values[field.key] ?? "")),
          }))}
          aria-invalid={Boolean(error)}
          className={`${inputClass}${errorClass}`}
        />
      );
    }

    return (
      <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : undefined}>
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
        {control}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  };

  const embedInit = useRef(false);
  useEffect(() => {
    if (!embed || embedInit.current) return;
    embedInit.current = true;
    if (canCreate) openAdd();
  }, [embed, canCreate]);

  return (
    <>
      {!embed && <PageMeta title={`${pageTitle} | Yatzar Operations`} description={`Yatzar Operations ${plural}`} />}
      {!embed && <PageBreadcrumb pageTitle={pageTitle} parent={parent} />}

      {pageError && (
        <div role="alert" className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {pageError}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-4 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          {notice}
        </div>
      )}

      {!showForm && !viewRecord && !embed && (
        <section className="max-w-full min-w-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{heading}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
            {canCreate && <button type="button" onClick={openAdd} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600">
              <span className="text-lg leading-none">+</span>
              {addLabel}
            </button>}
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-gray-400">⌕</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent px-3 ps-9 text-base text-gray-800 shadow-theme-xs transition outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 sm:text-sm dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800"
              />
            </div>
            <div className="relative flex flex-wrap items-center gap-2">
              {filters.length > 0 && (
                <button type="button" onClick={() => setPanel(panel === "filter" ? null : "filter")} className={toolBtn}>
                  Filter{filterCount ? ` (${filterCount})` : ""}
                </button>
              )}
              {sorts.length > 0 && (
                <button type="button" onClick={() => setPanel(panel === "sort" ? null : "sort")} className={toolBtn}>
                  Sort{sortState ? ` (${sorts[sortState.i].label})` : ""}
                </button>
              )}
              {showExport && (
                <button type="button" onClick={exportCsv} className={toolBtn}>Export CSV</button>
              )}
              {panel === "filter" && (
                <div className="absolute end-0 top-12 z-20 w-64 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
                  {filters.map((f, i) => {
                    const options = [...new Set(records.map(f.get).filter(Boolean))];
                    return (
                      <div key={f.label}>
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{f.label}</label>
                        <select
                          value={filterValues[i] ?? ""}
                          onChange={(e) => { setFilterValues((c) => ({ ...c, [i]: e.target.value })); setPage(1); }}
                          className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300"
                        >
                          <option value="">All</option>
                          {options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setFilterValues({})} className={`${toolBtn} w-full justify-center`}>Clear filter</button>
                </div>
              )}
              {panel === "sort" && (
                <div className="absolute end-0 top-12 z-20 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
                  {sorts.map((s, i) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSortState({ i, dir: sortState?.i === i && sortState.dir === "asc" ? "desc" : "asc" })}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      <span>{s.label}</span>
                      <span className="text-brand-500">{sortState?.i === i ? (sortState.dir === "asc" ? "↑" : "↓") : ""}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => setSortState(null)} className="w-full border-t border-gray-200 px-4 py-2.5 text-start text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5">Clear sort</button>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              entries
            </label>
          </div>

          {canDelete && selectedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-blue-50 px-5 py-3 text-sm dark:border-gray-800 dark:bg-white/5">
              <span><b>{selectedCount}</b> selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedIds([])} className={toolBtn}>Clear selection</button>
                <button type="button" onClick={bulkDelete} className="inline-flex h-10 items-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-500">Delete {selectedCount}</button>
              </div>
            </div>
          )}
          <div className="custom-scrollbar max-w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-start">
              <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                <tr>
                  {canDelete && <th className="w-12 px-5 py-3">
                    <input type="checkbox" checked={allPageSelected} onChange={toggleSelectAll} className="size-4 rounded accent-brand-500" aria-label={`Select all ${plural} on this page`} />
                  </th>}
                  {columns.map((column) => (
                    <th key={column.header} className={headerClass}>{column.header}</th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visible.map((record) => (
                  <tr key={record.id} className="transition hover:bg-gray-50 dark:hover:bg-white/2">
                    {canDelete && <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={() =>
                          setSelectedIds((current) =>
                            current.includes(record.id)
                              ? current.filter((id) => id !== record.id)
                              : [...current, record.id],
                          )
                        }
                        className="size-4 rounded accent-brand-500"
                        aria-label={`Select ${recordName(record)}`}
                      />
                    </td>}
                    {columns.map((column) => (
                      <td key={column.header} className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                        {column.render(record)}
                      </td>
                    ))}
                    <td className="px-3 py-4 sm:px-5">
                      <div className="flex items-center justify-center gap-1 sm:gap-3">
                        {moveButtons(record, "sm")}
                        <button type="button" onClick={() => openView(record)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10" aria-label={`View ${recordName(record)}`} title="View">
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        </button>
                        {canUpdate && <button type="button" onClick={() => openEdit(record)} className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:text-brand-400 dark:hover:bg-brand-500/10" aria-label={`Edit ${recordName(record)}`} title="Edit">
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" />
                            <path d="m13.5 6.5 4 4" />
                          </svg>
                        </button>}
                        {canDelete && <button type="button" onClick={() => { setNotice(""); setDeleteId(record.id); }} className="rounded-md p-1.5 text-error-500 hover:bg-error-50 hover:text-error-600 dark:text-error-400 dark:hover:bg-error-500/10" aria-label={`Delete ${recordName(record)}`} title="Delete">
                          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 7h16" />
                            <path d="M9 7V4h6v3" />
                            <path d="M7 7l1 12h8l1-12" />
                            <path d="M10 11v5M14 11v5" />
                          </svg>
                        </button>}
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
                {filtered.length === 0
                  ? `Showing 0 ${plural}`
                  : `Showing ${startIndex + 1} to ${Math.min(startIndex + entriesPerPage, filtered.length)} of ${filtered.length} ${plural}`}
              </span>
              <span>{selectedCount} selected</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage((c) => Math.max(1, c - 1))} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-transparent dark:text-gray-300">
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={currentPage === n ? "page" : undefined}
                  className={`size-9 rounded-lg border text-sm font-medium ${currentPage === n ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"}`}
                >
                  {n}
                </button>
              ))}
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((c) => Math.min(totalPages, c + 1))} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-transparent dark:text-gray-300">
                Next
              </button>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="mx-5 mb-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/2 dark:text-gray-400">
              {records.length === 0
                ? `No ${plural} yet. Select ${addLabel} to create one, or move a contact here from Contacts.`
                : `No ${plural} match your search.`}
            </div>
          )}
        </section>
      )}

      {!showForm && viewRecord && !embed && (
        <RecordView
          singular={singular}
          plural={plural}
          name={recordName(viewRecord)}
          subtitle={`${String(viewRecord.email || "—")}  |  ${String(viewRecord.phone || "—")}`}
          badge={viewBadge?.(viewRecord)}
          blocks={viewBlocks(viewRecord)}
          actions={moveButtons(viewRecord, "lg")}
          onBack={() => setViewId(null)}
          onEdit={canUpdate ? () => {
            setViewId(null);
            openEdit(viewRecord);
          } : undefined}
        />
      )}

      {showForm && (
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {viewing ? `View ${singular}` : editingId ? `Edit ${singular}` : addLabel}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {singular} details are stored locally in this browser.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeForm} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">
                  ← Back to table
                </button>
                {!viewing && canUpdate && canSave && moves.map((move) => (
                  <button key={move.label} type="button" disabled={busy} onClick={() => saveAndMove(move)} className={`rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50 ${toneClass[move.tone]}`}>
                    Save &amp; {move.label.toLowerCase()}
                  </button>
                ))}
                {!viewing && canSave && (
                  <button type="submit" form="record-form" className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600">
                    Save {singular.toLowerCase()}
                  </button>
                )}
              </div>
            </div>

            <form id="record-form" onSubmit={handleSave} noValidate>
              <fieldset disabled={viewing}>
              <div className="space-y-5 bg-gray-50/60 p-4 sm:p-6 dark:bg-gray-950/20">
                {sections.map((section) => (
                  <section key={section.title} className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-dark">
                    <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
                      <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">{section.title}</h4>
                      {section.subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{section.subtitle}</p>}
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">{section.fields.map(renderField)}</div>
                  </section>
                ))}
                {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {moveTarget && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/40 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">{moveTarget.move.label}</h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{moveTarget.move.confirm(recordName(moveTarget.record))}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setMoveTarget(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300">Cancel</button>
              <button type="button" disabled={busy} onClick={() => runMove(moveTarget.record, moveTarget.move)} className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{busy ? "Moving..." : "Move"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-gray-900/40 p-4">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Confirm delete</h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {recordToDelete
                ? `This will permanently remove ${recordName(recordToDelete)} from this browser.`
                : `This will permanently remove this ${singular.toLowerCase()} from this browser.`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
