import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  createRole,
  deleteRole,
  listRoles,
  updateRole,
  type PermissionValues,
  type RoleRecord,
} from "@/api/roles";
import {
  ContactsIcon,
  EditIcon,
  EyeIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
  WorkspaceIcon,
} from "@/icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { hasPermission, useAuth } from "@/context/AuthContext";

type Permission = "create" | "view" | "update" | "delete";
type PermissionMap = Record<string, Record<Permission, boolean>>;

type Role = {
  id: string | number;
  name: string;
  isSystem: boolean;
  permissions: PermissionMap;
};

type MenuItem = {
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

const operations: { key: Permission; label: string }[] = [
  { key: "create", label: "Create" },
  { key: "view", label: "View" },
  { key: "update", label: "Update" },
  { key: "delete", label: "Delete" },
];

const knownMenuItems: MenuItem[] = [
  { name: "Teams", icon: UsersIcon },
  { name: "App Permission", icon: ShieldIcon },
  { name: "Workspace", icon: WorkspaceIcon },
  { name: "Contacts", icon: ContactsIcon },
  { name: "Tasks", icon: ShieldIcon },
  { name: "Meetings", icon: ContactsIcon },
  { name: "Calls", icon: UsersIcon },
  { name: "Campaigns", icon: WorkspaceIcon },
  { name: "Email Marketing", icon: ContactsIcon },
  { name: "Event Webinar", icon: ShieldIcon },
];

const createPermissions = (
  enabled = false,
  items: MenuItem[] = knownMenuItems,
): PermissionMap =>
  Object.fromEntries(
    items.map(({ name }) => [
      name,
      operations.reduce(
        (permissions, operation) => ({
          ...permissions,
          [operation.key]: enabled,
        }),
        {} as Record<Permission, boolean>,
      ),
    ]),
  );

const tableInputClass =
  "h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent px-3 text-base text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 sm:text-sm dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800";

export default function AppPermission() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canCreateRole = hasPermission(user, "App Permission", "create");
  const canUpdateRole = hasPermission(user, "App Permission", "update");
  const canDeleteRole = hasPermission(user, "App Permission", "delete");
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(knownMenuItems);
  const [apiError, setApiError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | number | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [permissions, setPermissions] =
    useState<PermissionMap>(createPermissions());
  const editingRole = roles.find((role) => role.id === editingRoleId);

  const roleFromApi = (record: RoleRecord, menuCatalog: MenuItem[]): Role => {
    const mappedPermissions = createPermissions(false, menuCatalog);
    for (const permission of record.permissions) {
      mappedPermissions[permission.menu] = {
        create: permission.create,
        view: permission.view,
        update: permission.update,
        delete: permission.delete,
      };
    }

    return {
      id: record.id,
      name: record.name,
      isSystem: record.is_system,
      permissions: mappedPermissions,
    };
  };

  const refreshPermissionData = async () => {
    try {
      const roleRecords = await listRoles();
      const names = new Set(
        [
          ...(user?.permissions ?? []).map(({ menu }) => menu),
          ...roleRecords.flatMap((role) => role.permissions.map(({ menu }) => menu)),
        ],
      );
      const iconByName = new Map<string, MenuItem["icon"]>(
        knownMenuItems.map(({ name, icon }) => [
          name.toLowerCase().replace(/[^a-z0-9]/g, ""),
          icon,
        ] as const),
      );
      const menuNames = [...names];
      const menuCatalog = menuNames
        .sort((first, second) => first.localeCompare(second))
        .map((name) => ({
          name,
          icon:
            iconByName.get(name.toLowerCase().replace(/[^a-z0-9]/g, "")) ??
            ShieldIcon,
        }));
      setMenuItems(menuCatalog);
      setRoles(roleRecords.map((role) => roleFromApi(role, menuCatalog)));
      setApiError("");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to load permissions.",
      );
    }
  };

  useEffect(() => {
    void refreshPermissionData();
  }, []);

  useEffect(() => {
    const showRoleGrid = () => setIsEditorOpen(false);
    window.addEventListener("app-permission:navigate-view", showRoleGrid);
    return () =>
      window.removeEventListener("app-permission:navigate-view", showRoleGrid);
  }, []);

  const openCreate = () => {
    setIsReadOnly(false);
    setEditingRoleId(null);
    setRoleName("");
    setPermissions(createPermissions(false, menuItems));
    setIsEditorOpen(true);
  };

  const openEdit = (role: Role) => {
    setIsReadOnly(false);
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setPermissions(role.permissions);
    setIsEditorOpen(true);
  };

  const openView = (role: Role) => {
    setIsReadOnly(true);
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setPermissions(role.permissions);
    setIsEditorOpen(true);
  };

  const togglePermission = (menuName: string, operation: Permission) => {
    setPermissions((current) => ({
      ...current,
      [menuName]: {
        ...(current[menuName] ?? {
          create: false,
          view: false,
          update: false,
          delete: false,
        }),
        [operation]: !(current[menuName]?.[operation] ?? false),
      },
    }));
  };

  const saveRole = async () => {
    if (editingRoleId === null ? !canCreateRole : !canUpdateRole) return;
    const trimmedName = roleName.trim();
    if (!trimmedName) return;

    try {
      const payload = {
        name: trimmedName,
        permissions: Object.fromEntries(
          menuItems.map(({ name }) => [
            name,
            permissions[name] ?? {
              create: false,
              view: false,
              update: false,
              delete: false,
            },
          ]),
        ) as Record<string, PermissionValues>,
      };
      if (editingRoleId === null) {
        await createRole(payload);
      } else {
        await updateRole(String(editingRoleId), payload);
      }
      await refreshPermissionData();
      window.dispatchEvent(new Event("auth:permissions-updated"));
      setIsEditorOpen(false);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to save role.",
      );
    }
  };

  const filteredRoles = roles
    .filter((role) => role.name.toLowerCase().includes(roleSearch.toLowerCase()))
    .sort((first, second) => first.name.localeCompare(second.name));

  return (
    <>
      <PageMeta
        title="App Permission | Yatzar Operations"
        description="Yatzar Operations app permissions"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.appPermission")} />
      {apiError && (
        <p className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {apiError}
        </p>
      )}
      <div className="space-y-6">
        {isEditorOpen && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6 dark:border-gray-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <input
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  readOnly={isReadOnly || Boolean(editingRole?.isSystem)}
                  placeholder="Role name"
                  aria-label="Role name"
                  className={`h-11 w-full max-w-sm border-0 bg-transparent px-0 text-xl font-semibold outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white/90 dark:placeholder:text-gray-500 ${isReadOnly ? "cursor-default text-gray-500 dark:text-gray-400" : "border-b border-gray-300 text-gray-800 focus:border-brand-500 dark:border-gray-700"}`}
                />
                <div className="flex gap-3">
                  {isReadOnly ? (
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(false)}
                      className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      Back
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveRole}
                        disabled={!roleName.trim()}
                        className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {editingRoleId === null ? "Create role" : "Update role"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-start">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                    <th className="px-5 py-3.5 text-start text-xs font-semibold tracking-wider text-gray-500 uppercase sm:px-6">
                      Menu
                    </th>
                    {operations.map((operation) => (
                      <th
                        key={operation.key}
                        className="px-3 py-3.5 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase"
                      >
                        {operation.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(({ name, icon: Icon }) => (
                    <tr
                      key={name}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800/80"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                            <Icon className="size-4" />
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {name}
                          </span>
                        </div>
                      </td>
                      {operations.map((operation) => (
                        <td
                          key={operation.key}
                          className="px-3 py-4 text-center"
                        >
                          <input
                            type="checkbox"
                            checked={permissions[name]?.[operation.key] ?? false}
                            disabled={isReadOnly}
                            onChange={() =>
                              togglePermission(name, operation.key)
                            }
                            aria-label={`${operation.label} ${name}`}
                            className="size-4 rounded border-gray-300 text-brand-500 accent-brand-500 focus:ring-brand-500 dark:border-gray-700"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!isEditorOpen && (
          <section className="max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Role permissions
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Permissions are configured on roles. Each account inherits the permissions of its assigned role.
                </p>
              </div>
              {canCreateRole && <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
              >
                <span className="text-lg leading-none">+</span>
                Create role
              </button>}
            </div>
            <div className="p-4 sm:p-5">
              <input
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                className={`${tableInputClass} max-w-md`}
                placeholder="Search roles"
                aria-label="Search roles"
              />
            </div>
            <div className="custom-scrollbar max-w-full overflow-x-auto">
              <table className="w-full min-w-[680px] text-start">
                <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                  <tr>
                    <th className="px-5 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Role</th>
                    <th className="px-5 py-3 text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Permissions</th>
                    <th className="px-5 py-3 text-end text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRoles.map((role) => {
                    const enabled = Object.values(role.permissions)
                      .flatMap((menu) => Object.values(menu))
                      .filter(Boolean).length;
                    return (
                      <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-white/2">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                              <ShieldIcon className="size-4" />
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-white/90">{role.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {enabled} of {menuItems.length * operations.length} permissions enabled
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => openView(role)} aria-label={`View ${role.name} permissions`} title="View" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5">
                              <EyeIcon className="size-4" />
                            </button>
                            {canUpdateRole && <button type="button" onClick={() => openEdit(role)} aria-label={`Edit ${role.name} permissions`} title="Edit" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5">
                              <EditIcon className="size-4" />
                            </button>}
                            {canDeleteRole && <button type="button" onClick={() => setDeleteTarget(role)} disabled={role.isSystem} aria-label={`Delete ${role.name}`} title={role.isSystem ? "System roles cannot be deleted" : "Delete role"} className="rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-error-500/10">
                              <TrashIcon className="size-4" />
                            </button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRoles.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No roles found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      {deleteTarget && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-950/40 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xl dark:border-gray-800 dark:bg-gray-dark"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-role-title"
          >
            <h3
              id="delete-role-title"
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              Delete role?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This will remove {deleteTarget.name} and its permission settings.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    if (!canDeleteRole) return;
                    try {
                      await deleteRole(String(deleteTarget.id));
                      await refreshPermissionData();
                      window.dispatchEvent(new Event("auth:permissions-updated"));
                      setDeleteTarget(null);
                    } catch (error) {
                      setApiError(
                        error instanceof Error
                          ? error.message
                          : "Unable to delete role.",
                      );
                    }
                  })();
                }}
                className="h-10 rounded-lg bg-error-500 px-4 text-sm font-medium text-white hover:bg-error-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

