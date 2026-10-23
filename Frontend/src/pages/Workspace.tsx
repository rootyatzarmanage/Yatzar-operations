import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import SearchableSelect from "@/components/common/SearchableSelect";
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
  updateWorkspace,
  deleteWorkspaces,
  uploadWorkspaceImage,
  deleteWorkspaceImage,
  getWorkspaceImageUrl,
} from "@/api/workspaces";
import type {
  Workspace as BaseWorkspace,
  WorkspacePayload as BaseWorkspacePayload,
  WorkspaceStatus,
} from "@/api/workspaces";
import { useWorkspace } from "@/context/WorkspaceContext";
import { hasPermission, useAuth } from "@/context/AuthContext";
import { getEmployeeWorkspaceIds } from "@/utils/workspaceAccess";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";

type WorkspaceItem = BaseWorkspace;

type WorkspaceFormValues = {
  name: string;
  description: string;
  status: WorkspaceStatus;
  image: string;
};

const emptyForm: WorkspaceFormValues = {
  name: "",
  description: "",
  status: "Enabled",
  image: "",
};

const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 360;

const LayoutIcon = ({ className = "size-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);

const fieldClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm text-gray-700 transition outline-none focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800 dark:focus:bg-transparent";

export default function Workspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = hasPermission(user, "Workspace", "create");
  const canUpdate = hasPermission(user, "Workspace", "update");
  const canDelete = hasPermission(user, "Workspace", "delete");
  const { enterWorkspace } = useWorkspace();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<WorkspaceFormValues>(emptyForm);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
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
        if (active) {
          const assignedIds = getEmployeeWorkspaceIds(user?.email ?? "");
          setWorkspaces(
            (assignedIds
              ? items.filter((item) => assignedIds.includes(item.id))
              : items) as WorkspaceItem[],
          );
        }
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
  }, [user?.email]);

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

  // Selection is counted against the currently filtered list (all pages),
  // so the bulk bar and "Select all" always match what the search shows.
  const visibleSelectedIds = useMemo(() => {
    const filteredIds = new Set(filteredWorkspaces.map((item) => item.id));
    return selectedIds.filter((id) => filteredIds.has(id));
  }, [filteredWorkspaces, selectedIds]);
  const selectedCount = visibleSelectedIds.length;
  const allSelected =
    filteredWorkspaces.length > 0 &&
    selectedCount === filteredWorkspaces.length;
  const someSelected = selectedCount > 0 && !allSelected;

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
    setSelectedImage(null);
    setRemoveImage(false);
    setFormError("");
    setApiError("");
  };

  const handleAddNew = () => {
    if (!canCreate) return;
    setSelectedImage(null);
    setRemoveImage(false);
    setFormValues(emptyForm);
    setEditingId(null);
    setFormError("");
    setApiError("");
    setShowForm(true);
  };

  const handleEdit = (workspace: WorkspaceItem) => {
    if (!canUpdate) return;
    setSelectedImage(null);
    setRemoveImage(false);
    setEditingId(workspace.id);
    setFormValues({
      name: workspace.name,
      description: workspace.description,
      status: workspace.status,
      image: getWorkspaceImageUrl(workspace.image),
    });
    setFormError("");
    setApiError("");
    setShowForm(true);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!canUpdate) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please choose an image file.");
      return;
    }
    setSelectedImage(file);
    setRemoveImage(false);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Cover-crop to 640x360 so every card image has the same shape.
        const canvas = document.createElement("canvas");
        canvas.width = IMAGE_WIDTH;
        canvas.height = IMAGE_HEIGHT;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setFormError("Unable to process the image.");
          return;
        }
        const scale = Math.max(
          IMAGE_WIDTH / img.width,
          IMAGE_HEIGHT / img.height,
        );
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(
          img,
          (IMAGE_WIDTH - w) / 2,
          (IMAGE_HEIGHT - h) / 2,
          w,
          h,
        );
        setFormError("");
        handleFieldChange("image", canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => setFormError("Unable to read the selected image.");
      img.src = reader.result as string;
    };
    reader.onerror = () => setFormError("Unable to read the selected image.");
    reader.readAsDataURL(file);
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
    const payload: BaseWorkspacePayload = {
      name: trimmedName,
      description: trimmedDescription,
      status: formValues.status,
    };
    let createdWorkspace: WorkspaceItem | null = null;
    try {
      let saved: WorkspaceItem;
      if (editingId !== null) {
        if (!canUpdate) return;
        saved = await updateWorkspace(
          editingId,
          payload,
        );
      } else {
        if (!canCreate) return;
        saved = await createWorkspace(payload);
        createdWorkspace = saved;
      }
      if (selectedImage) {
        const uploaded = await uploadWorkspaceImage(saved.id, selectedImage, Boolean(saved.image));
        saved = { ...saved, image: uploaded.image };
      } else if (removeImage && saved.image) {
        await deleteWorkspaceImage(saved.id);
        saved = { ...saved, image: null };
      }
      setWorkspaces((current) => editingId !== null
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current]);
      if (editingId === null) setPage(1);
      resetForm();
    } catch (error) {
      if (createdWorkspace) {
        setWorkspaces((current) => [createdWorkspace!, ...current]);
        setEditingId(createdWorkspace.id);
        setFormError("Workspace was created, but its image could not be saved. Save again to retry.");
      } else {
        setFormError(
          error instanceof Error ? error.message : "Unable to save workspace.",
        );
      }
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
    if (!canDelete) return;
    setDeleteId(id);
  };

  const workspaceToDelete =
    workspaces.find((workspace) => workspace.id === deleteId) ?? null;

  const confirmDelete = async () => {
    if (deleteId === null || !canDelete) return;
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

  // Select / unselect every workspace in the current (filtered) result.
  const toggleSelectAll = () => {
    if (allSelected) {
      const filteredIds = new Set(filteredWorkspaces.map((item) => item.id));
      setSelectedIds((current) => current.filter((id) => !filteredIds.has(id)));
      return;
    }

    setSelectedIds((current) => [
      ...new Set([...current, ...filteredWorkspaces.map((item) => item.id)]),
    ]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (!canDelete || visibleSelectedIds.length === 0 || isSaving) return;

    const idsToDelete = [...visibleSelectedIds];

    const confirmed = window.confirm(
      `Are you sure you want to delete ${idsToDelete.length} selected workspace(s)?`,
    );

    if (!confirmed) return;

    setApiError("");
    setIsSaving(true);

    try {
      await deleteWorkspaces(idsToDelete);

      setWorkspaces((current) =>
        current.filter((workspace) => !idsToDelete.includes(workspace.id)),
      );

      setSelectedIds((current) =>
        current.filter((id) => !idsToDelete.includes(id)),
      );
    } catch (error) {
      // Some requests might have succeeded before another failed.
      // Reload the list so the UI matches the backend.
      try {
        const latestWorkspaces = (await listWorkspaces()) as WorkspaceItem[];
        setWorkspaces(latestWorkspaces);
        setSelectedIds((current) =>
          current.filter((id) =>
            latestWorkspaces.some((workspace) => workspace.id === id),
          ),
        );
      } catch {
        // Keep the existing list if reloading also fails.
      }

      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to delete selected workspaces.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openWorkspace = (workspace: WorkspaceItem) => {
    enterWorkspace({ id: workspace.id, name: workspace.name });
    navigate("/contacts");
  };

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
          {/* Header */}
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Workspace information
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Select a workspace card to open its menu.
              </p>
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={handleAddNew}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
              >
                <span className="text-lg leading-none">+</span>Add workspace
              </button>
            )}
          </div>

          {/* Search + page size */}
          <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 dark:border-gray-800">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  className="size-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9.375 17.208a7.833 7.833 0 1 0 0-15.667 7.833 7.833 0 0 0 0 15.667ZM15.418 14.357l2.82 2.821"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
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
                <SearchableSelect
                  size="sm"
                  value={entriesPerPage}
                  onChange={(val) => {
                    setEntriesPerPage(Number(val));
                    setPage(1);
                  }}
                  options={[5, 10, 25]}
                  className="h-10 w-20"
                />
                entries
              </label>
            </div>
          </div>

          {/* Bulk action bar */}
          {canDelete && selectedCount > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 bg-blue-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-800 dark:bg-white/5">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{selectedCount}</span> selected
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={isSaving}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Clear selection
                </button>

                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                  {isSaving ? "Deleting..." : `Delete ${selectedCount}`}
                </button>
              </div>
            </div>
          )}

          {/* Card grid */}
          <div className="border-t border-gray-200 px-4 pb-2 sm:px-6 dark:border-gray-800">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading workspaces…
              </p>
            ) : (
              <>
                {canDelete && (
                  <label className="flex w-fit cursor-pointer items-center gap-2 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleSelectAll}
                      disabled={filteredWorkspaces.length === 0}
                      className="size-4 rounded accent-brand-500"
                      aria-label="Select all workspaces"
                    />
                    Select all
                  </label>
                )}

                <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {paginatedWorkspaces.map((workspace) => {
                    const isSelected = selectedIds.includes(workspace.id);
                    return (
                      <article
                        key={workspace.id}
                        onClick={() => openWorkspace(workspace)}
                        title={`Open ${workspace.name}`}
                        className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-theme-xs transition hover:border-brand-500 hover:shadow-theme-md dark:bg-gray-dark ${
                          isSelected
                            ? "border-brand-500 ring-2 ring-brand-500/30"
                            : "border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <div className="relative grid h-40 w-full place-items-center overflow-hidden bg-linear-to-br from-brand-50 to-gray-100 text-brand-500 dark:from-white/5 dark:to-white/2 dark:text-brand-400">
                          {workspace.image ? (
                            <img
                              src={getWorkspaceImageUrl(workspace.image)}
                              alt={workspace.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="grid size-14 place-items-center rounded-2xl bg-white/80 dark:bg-gray-900/50">
                              <LayoutIcon className="size-7" />
                            </span>
                          )}
                          {canDelete && (
                            <label
                              onClick={(event) => event.stopPropagation()}
                              className="absolute top-3 left-3 grid size-7 cursor-pointer place-items-center rounded-md bg-white/90 shadow dark:bg-gray-900/80"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(workspace.id)}
                                className="size-4 rounded accent-brand-500"
                                aria-label={`Select ${workspace.name}`}
                              />
                            </label>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="truncate text-base font-semibold text-brand-500 group-hover:underline dark:text-brand-400">
                              {workspace.name}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                                workspace.status === "Enabled"
                                  ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
                                  : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400"
                              }`}
                            >
                              {workspace.status}
                            </span>
                          </div>

                          <p className="line-clamp-2 flex-1 text-sm text-gray-500 dark:text-gray-400">
                            {workspace.description || "No description added."}
                          </p>

                          <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
                            <span className="text-xs font-medium whitespace-nowrap text-brand-500 dark:text-brand-400">
                              Open &rarr;
                            </span>
                            <div className="flex items-center gap-3">
                              {canUpdate && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEdit(workspace);
                                  }}
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
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDelete(workspace.id);
                                  }}
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
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer / pagination */}
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-800">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{selectedCount} selected</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-transparent dark:text-gray-300"
              >
                Previous
              </button>
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`size-9 rounded-lg border text-sm font-medium ${currentPage === pageNumber ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"}`}
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
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-transparent dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>

          {!isLoading && filteredWorkspaces.length === 0 && (
            <div className="mx-4 mb-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 sm:mx-6 dark:border-gray-800 dark:bg-white/2 dark:text-gray-400">
              No workspace matches your search.
            </div>
          )}
        </section>
      ) : (
        <section className="max-w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {editingId !== null ? "Edit workspace" : "Add workspace"}
            </h3>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:flex-none sm:px-4 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              {(editingId === null ? canCreate : canUpdate) && (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="h-10 flex-1 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 sm:flex-none sm:px-4"
                >
                  {isSaving
                    ? "Saving…"
                    : editingId !== null
                      ? "Save changes"
                      : "Submit"}
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 p-6 sm:p-7 dark:border-gray-800">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Workspace image */}
              <div className="flex items-center gap-4 md:col-span-2">
                <div className="grid h-24 w-40 shrink-0 place-items-center overflow-hidden rounded-xl bg-gray-100 text-gray-400 dark:bg-white/5">
                  {formValues.image && !removeImage ? (
                    <img
                      src={formValues.image}
                      alt="Workspace"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <LayoutIcon />
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Workspace image
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
                      >
                        {formValues.image ? "Change image" : "Upload image"}
                      </button>
                    )}
                    {formValues.image && canUpdate && (
                      <button
                        type="button"
                        onClick={() => {
                          handleFieldChange("image", "");
                          setSelectedImage(null);
                          setRemoveImage(true);
                        }}
                        className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Shown at the top of the workspace card.
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  required
                  label="Status"
                  value={formValues.status}
                  onChange={(val) =>
                    handleFieldChange(
                      "status",
                      val as WorkspaceStatus,
                    )
                  }
                  options={["Enabled", "Disabled"]}
                  className={fieldClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  className={fieldClass}
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-dark">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Confirm delete
            </h3>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {workspaceToDelete
                ? `This will remove ${workspaceToDelete.name} from the active workspace list.`
                : "This will remove the workspace from the active workspace list."}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
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
