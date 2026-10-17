import type { ReactNode } from "react";

export type ViewItem = { label: string; value: string };
export type ViewBlock = { title: string; subtitle?: string; items: ViewItem[] };

type Props = {
  singular: string;
  plural: string;
  name: string;
  subtitle: string;
  badge?: string;
  imageUrl?: string;
  blocks: ViewBlock[];
  actions?: ReactNode;
  onBack: () => void;
  onEdit?: () => void;
};

const card =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function RecordView({
  singular,
  plural,
  name,
  subtitle,
  badge,
  imageUrl,
  blocks,
  actions,
  onBack,
  onEdit,
}: Props) {
  const initials = initialsOf(name);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-brand-500 hover:underline"
        >
          &larr; Back to {plural}
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          {onEdit && <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
          >
            Edit {singular.toLowerCase()}
          </button>}
        </div>
      </div>

      <section className={`${card} mb-6 flex items-center gap-5 p-5 sm:p-6`}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="size-20 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-full bg-gray-100 text-xl font-semibold text-brand-500 dark:bg-white/10">
            {initials || "?"}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold break-words text-gray-800 dark:text-white/90">
            {name || `Unnamed ${singular.toLowerCase()}`}
          </h2>
          <p className="mt-1 text-sm break-words text-gray-500 dark:text-gray-400">{subtitle}</p>
          {badge && (
            <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">
              {badge}
            </span>
          )}
        </div>
      </section>

      <div className="space-y-6">
        {blocks.map((block) => (
          <section key={block.title} className={`${card} p-5 sm:p-6`}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{block.title}</h3>
            {block.subtitle && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{block.subtitle}</p>
            )}
            <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              {block.items.map((item) => (
                <div key={item.label} className={item.label === "Description" ? "md:col-span-2" : undefined}>
                  <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="text-sm font-medium break-words whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {item.value || "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
