import { createTag, deleteTag, listTags, updateTag, type Tag } from "@/api/tags";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useWorkspace } from "@/context/WorkspaceContext";
import { hasPermission, useAuth } from "@/context/AuthContext";
import { EditIcon, TrashIcon } from "@/icons";
import { useEffect, useState } from "react";

export default function Tags() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const canCreate = hasPermission(user, "Tags", "create");
  const canUpdate = hasPermission(user, "Tags", "update");
  const canDelete = hasPermission(user, "Tags", "delete");
  const [tags, setTags] = useState<Tag[]>([]);
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    if (!currentWorkspace?.id) {
      setTags([]);
      return;
    }
    try {
      setTags(await listTags(true));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load tags.");
    }
  };

  useEffect(() => {
    void refresh();
  }, [currentWorkspace?.id]);

  const save = async () => {
    const name = value.trim();
    if (!name || !currentWorkspace?.id) return;
    try {
      if (editingId) await updateTag(editingId, { name });
      else await createTag(name, currentWorkspace.id);
      setValue("");
      setEditingId(null);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save tag.");
    }
  };

  return (
    <>
      <PageMeta title="Tags | Yatzar Operations" description="Manage workspace tags" />
      <PageBreadcrumb pageTitle="Tags" parent={{ label: "Workspace" }} />
      {error && <p role="alert" className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</p>}
      <section className="w-full rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Workspace tags</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage tags for {currentWorkspace?.name ?? "this workspace"}.</p>
        </div>
        <div className="p-5">
          {(canCreate || (canUpdate && editingId !== null)) && <div className="flex flex-col gap-3 sm:flex-row">
            <input value={value} onChange={(event) => setValue(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90" placeholder="Enter tag" />
            <button type="button" onClick={() => void save()} className="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">{editingId ? "Update" : "Add"}</button>
          </div>}
          <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {tags.map((tag) => <div key={tag.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">{tag.name}</span>
              <div className="flex items-center gap-1">
                {canUpdate && <button type="button" onClick={() => void updateTag(tag.id, { status: tag.status === 1 ? 0 : 1 }).then(refresh).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to update tag."))} className={`mr-2 rounded-full px-2.5 py-1 text-xs ${tag.status === 1 ? "bg-success-50 text-success-600" : "bg-gray-100 text-gray-500"}`}>{tag.status === 1 ? "Active" : "Inactive"}</button>}
                {canUpdate && <button type="button" onClick={() => { setValue(tag.name); setEditingId(tag.id); }} className="rounded-md p-1.5 text-brand-500" aria-label={`Edit ${tag.name}`}><EditIcon className="size-4" /></button>}
                {canDelete && <button type="button" onClick={() => void deleteTag(tag.id).then(refresh).catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to delete tag."))} className="rounded-md p-1.5 text-error-500" aria-label={`Delete ${tag.name}`}><TrashIcon className="size-4" /></button>}
              </div>
            </div>)}
          </div>
        </div>
      </section>
    </>
  );
}
