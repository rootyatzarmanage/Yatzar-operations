import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { EditIcon, TrashIcon } from "@/icons";
import {
  getTeamDropdownOptions,
  saveTeamDropdownOptions,
} from "@/utils/teamOptions";
import { useState } from "react";

export default function Others() {
  const [departments, setDepartments] = useState(
    () => getTeamDropdownOptions().departments,
  );
  const [reportingManagers, setReportingManagers] = useState(
    () => getTeamDropdownOptions().reportingManagers,
  );
  const [activeType, setActiveType] = useState<
    "departments" | "reportingManagers"
  >("departments");
  const [value, setValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const values = activeType === "departments" ? departments : reportingManagers;
  const setValues = (next: string[]) => {
    if (activeType === "departments") {
      setDepartments(next);
      saveTeamDropdownOptions({ departments: next, reportingManagers });
    } else {
      setReportingManagers(next);
      saveTeamDropdownOptions({ departments, reportingManagers: next });
    }
  };

  const saveValue = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = [...values];
    if (editingIndex === null) next.push(trimmed);
    else next[editingIndex] = trimmed;
    setValues([...new Set(next)]);
    setValue("");
    setEditingIndex(null);
  };

  return (
    <>
      <PageMeta
        title="Others | Yatzar Operation"
        description="Manage team dropdown values"
      />
      <PageBreadcrumb pageTitle="Others" />
      <section className="w-full rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Dropdown values
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage the values available in the team form.
          </p>
        </div>
        <div className="flex gap-6 border-b border-gray-200 px-5 dark:border-gray-800">
          {(["departments", "reportingManagers"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveType(type);
                setValue("");
                setEditingIndex(null);
              }}
              className={`border-b-2 py-4 text-sm font-medium ${activeType === type ? "border-brand-500 text-brand-500" : "border-transparent text-gray-500 dark:text-gray-400"}`}
            >
              {type === "departments" ? "Department" : "Reporting manager"}
            </button>
          ))}
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-14 min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 text-base text-gray-800 shadow-theme-xs sm:h-11 sm:text-sm dark:border-gray-800 dark:text-white/90"
              placeholder={`Enter ${activeType === "departments" ? "department" : "reporting manager"}`}
            />
            <button
              type="button"
              onClick={saveValue}
              className="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"
            >
              {editingIndex === null ? "Add" : "Update"}
            </button>
          </div>
          <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {values.map((item, index) => (
              <div
                key={item}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setValue(item);
                      setEditingIndex(index);
                    }}
                    className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                    aria-label={`Edit ${item}`}
                    title="Edit"
                  >
                    <EditIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setValues(
                        values.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="rounded-md p-1.5 text-error-500 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                    aria-label={`Delete ${item}`}
                    title="Delete"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
