import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "@/api/workspaces";
import type {
  Workspace as WorkspaceItem,
  WorkspacePayload as WorkspaceRequest,
  WorkspaceStatus,
} from "@/api/workspaces";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type WorkspaceFormValues = {
  name: string;
  description: string;
  status: WorkspaceStatus;
};

const emptyForm: WorkspaceFormValues = {
  name: "",
  description: "",
  status: "Enabled",
};

export default function Workspace() {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<WorkspaceFormValues>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5);

  useEffect(() => {
    let active = true;
    void listWorkspaces()
      .then((items) => {
        if (active) setWorkspaces(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setApiError(
            error instanceof Error
              ? error.message
              : "Unable to load workspaces.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredWorkspaces = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return workspaces;

    return workspaces.filter(
      (workspace) =>
        workspace.name.toLowerCase().includes(query) ||
        workspace.description.toLowerCase().includes(query) ||
        workspace.status.toLowerCase().includes(query),
    );
  }, [searchTerm, workspaces]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredWorkspaces.length / entriesPerPage),
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedWorkspaces = filteredWorkspaces.slice(startIndex, endIndex);
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  );

  const handleFieldChange = (
    field: keyof WorkspaceFormValues,
    value: string,
  ) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormValues(emptyForm);
    setFormError("");
    setApiError("");
  };

  const handleAddNew = () => {
    setFormValues(emptyForm);
    setEditingId(null);
    setFormError("");
    setApiError("");
    setShowForm(true);
  };

  const handleEdit = (workspace: WorkspaceItem) => {
    setEditingId(workspace.id);
    setFormValues({
      name: workspace.name,
      description: workspace.description,
      status: workspace.status,
    });
    setFormError("");
    setApiError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    const trimmedName = formValues.name.trim();
    const trimmedDescription = formValues.description.trim();

    if (!trimmedName || !trimmedDescription || !formValues.status) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setFormError("");
    setApiError("");
    setIsSaving(true);
    const payload: WorkspaceRequest = {
      name: trimmedName,
      description: trimmedDescription,
      status: formValues.status,
    };
    try {
      if (editingId !== null) {
        const saved = await updateWorkspace(editingId, payload);
        setWorkspaces((current) =>
          current.map((item) => (item.id === saved.id ? saved : item)),
        );
      } else {
        const saved = await createWorkspace(payload);
        setWorkspaces((current) => [saved, ...current]);
        setPage(1);
      }
      resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save workspace.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const workspaceToDelete =
    workspaces.find((workspace) => workspace.id === deleteId) ?? null;

  const confirmDelete = async () => {
    if (deleteId === null) return;
    setApiError("");
    setIsSaving(true);
    try {
      await deleteWorkspace(deleteId);
      setWorkspaces((current) =>
        current.filter((workspace) => workspace.id !== deleteId),
      );
      setSelectedIds((current) => current.filter((id) => id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to delete workspace.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectAll = () => {
    const allPageSelected =
      paginatedWorkspaces.length > 0 &&
      paginatedWorkspaces.every((workspace) =>
        selectedIds.includes(workspace.id),
      );
    if (allPageSelected) {
      setSelectedIds((current) =>
        current.filter(
          (selectedId) =>
            !paginatedWorkspaces.some(
              (workspace) => workspace.id === selectedId,
            ),
        ),
      );
      return;
    }

    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...paginatedWorkspaces.map((workspace) => workspace.id),
      ]),
    ]);
  };

  const selectedCount = selectedIds.length;

  return (
    <>
      <PageMeta
        title="Workspace | Yatzar Operation"
        description="Yatzar Operation workspace management"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.workspace")} />
      {apiError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
        >
          {apiError}
        </div>
      )}

      {!showForm ? (
        <section className="max-w-full min-w-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Workspace information
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage workspace records and access in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              <span className="text-lg leading-none">+</span>Add workspace
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-gray-400">
                ⌕
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search workspace"
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
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                entries
              </label>
            </div>
          </div>

          <div className="custom-scrollbar max-w-full overflow-x-auto">
            {isLoading ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading workspaces…
              </p>
            ) : (
              <table className="w-full min-w-full text-start sm:min-w-165 lg:min-w-full">
                <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                  <tr>
                    <th className="w-12 px-5 py-3">
                      <input
                        type="checkbox"
                        checked={
                          paginatedWorkspaces.length > 0 &&
                          paginatedWorkspaces.every((workspace) =>
                            selectedIds.includes(workspace.id),
                          )
                        }
                        onChange={toggleSelectAll}
                        className="size-4 rounded accent-brand-500"
                        aria-label="Select all workspaces on this page"
                      />
                    </th>
                    <th className="px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      Workspace name
                    </th>
                    <th className="px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-3 py-3 text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedWorkspaces.map((workspace) => (
                    <tr
                      key={workspace.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/2"
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(workspace.id)}
                          onChange={() => toggleSelected(workspace.id)}
                          className="size-4 rounded accent-brand-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-sm font-medium text-gray-800 sm:px-5 dark:text-white/90">
                        {workspace.name}
                      </td>
                      <td className="px-3 py-4 sm:px-5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${workspace.status === "Enabled" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"}`}
                        >
                          {workspace.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 sm:px-5">
                        <div className="flex items-center justify-center gap-1 text-sm font-medium sm:gap-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(workspace)}
                            className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:text-brand-400 dark:hover:bg-brand-500/10"
                            aria-label={`Edit ${workspace.name}`}
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
                            onClick={() => handleDelete(workspace.id)}
                            className="rounded-md p-1.5 text-error-500 hover:bg-error-50 hover:text-error-600 dark:text-error-400 dark:hover:bg-error-500/10"
                            aria-label={`Delete ${workspace.name}`}
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
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
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

          {!isLoading && filteredWorkspaces.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
              No workspace matches your search.
            </div>
          )}
        </section>
      ) : (
        <section className="max-w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editingId !== null ? "Edit workspace" : "Add workspace"}
              </h3>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:px-4 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="h-10 flex-1 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 sm:flex-none sm:px-4"
              >
                {isSaving
                  ? "Saving…"
                  : editingId !== null
                    ? "Save changes"
                    : "Submit"}
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Workspace name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formValues.name}
                  onChange={(event) =>
                    handleFieldChange("name", event.target.value)
                  }
                  placeholder="Enter workspace name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 transition outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formValues.status}
                  onChange={(event) =>
                    handleFieldChange(
                      "status",
                      event.target.value as WorkspaceStatus,
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 transition outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Enabled">Enabled</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formValues.description}
                  onChange={(event) =>
                    handleFieldChange("description", event.target.value)
                  }
                  rows={4}
                  placeholder="Enter description"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 transition outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {formError && (
              <p className="mt-4 text-sm text-red-600">{formError}</p>
            )}
          </div>
        </section>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-800">
              Confirm delete
            </h3>
            <p className="mt-3 text-sm text-gray-600">
              {workspaceToDelete
                ? `This will remove ${workspaceToDelete.name} from the active workspace list.`
                : "This will remove the workspace from the active workspace list."}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSaving}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
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
