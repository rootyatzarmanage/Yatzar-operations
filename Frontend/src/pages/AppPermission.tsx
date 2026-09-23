import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  ContactsIcon,
  EditIcon,
  GridIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
  WorkspaceIcon,
} from "@/icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type Permission = "create" | "list" | "update" | "delete";
type PermissionMap = Record<string, Record<Permission, boolean>>;

type Role = {
  id: number;
  name: string;
  permissions: PermissionMap;
};

type MenuItem = {
  name: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

const operations: { key: Permission; label: string }[] = [
  { key: "create", label: "Create" },
  { key: "list", label: "List" },
  { key: "update", label: "Update" },
  { key: "delete", label: "Delete" },
];

const menuItems: MenuItem[] = [
  { name: "Teams", icon: UsersIcon },
  { name: "App Permission", icon: ShieldIcon },
  { name: "Workspace", icon: WorkspaceIcon },
  { name: "Contacts", icon: ContactsIcon },
];

const createPermissions = (enabled = false): PermissionMap =>
  Object.fromEntries(
    menuItems.map(({ name }) => [
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

const initialRoles: Role[] = [
  {
    id: 1,
    name: "Super Admin",
    permissions: createPermissions(true),
  },
  {
    id: 2,
    name: "Admin",
    permissions: {
      ...createPermissions(),
      Teams: { create: true, list: true, update: true, delete: true },
      Workspace: { create: true, list: true, update: true, delete: false },
      Contacts: { create: true, list: true, update: true, delete: false },
    },
  },
  {
    id: 3,
    name: "Manager",
    permissions: {
      ...createPermissions(),
      Teams: { create: true, list: true, update: true, delete: false },
      Workspace: { create: false, list: true, update: true, delete: false },
      Contacts: { create: true, list: true, update: true, delete: false },
    },
  },
  {
    id: 4,
    name: "Team Leader",
    permissions: {
      ...createPermissions(),
      Teams: { create: false, list: true, update: true, delete: false },
      Workspace: { create: false, list: true, update: false, delete: false },
      Contacts: { create: false, list: true, update: false, delete: false },
    },
  },
  {
    id: 5,
    name: "Accountant",
    permissions: {
      ...createPermissions(),
      Workspace: { create: true, list: true, update: true, delete: false },
      Contacts: { create: false, list: true, update: false, delete: false },
    },
  },
  {
    id: 6,
    name: "Employee",
    permissions: {
      ...createPermissions(),
      Teams: { create: false, list: true, update: false, delete: false },
      Workspace: { create: false, list: true, update: false, delete: false },
    },
  },
  {
    id: 7,
    name: "Viewer",
    permissions: menuItems.reduce(
      (permissions, { name }) => ({
        ...permissions,
        [name]: { create: false, list: true, update: false, delete: false },
      }),
      {},
    ),
  },
];

export default function AppPermission() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] =
    useState<PermissionMap>(createPermissions());

  useEffect(() => {
    const showRoleGrid = () => setIsEditorOpen(false);
    window.addEventListener("app-permission:navigate-list", showRoleGrid);
    return () =>
      window.removeEventListener("app-permission:navigate-list", showRoleGrid);
  }, []);

  const openCreate = () => {
    setEditingRoleId(null);
    setRoleName("");
    setPermissions(createPermissions());
    setIsEditorOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setPermissions(role.permissions);
    setIsEditorOpen(true);
  };

  const togglePermission = (menuName: string, operation: Permission) => {
    setPermissions((current) => ({
      ...current,
      [menuName]: {
        ...current[menuName],
        [operation]: !current[menuName][operation],
      },
    }));
  };

  const saveRole = () => {
    const trimmedName = roleName.trim();
    if (!trimmedName) return;

    if (editingRoleId === null) {
      setRoles((current) => [
        ...current,
        {
          id: Date.now(),
          name: trimmedName,
          permissions,
        },
      ]);
    } else {
      setRoles((current) =>
        current.map((role) =>
          role.id === editingRoleId
            ? {
                ...role,
                name: trimmedName,
                permissions,
              }
            : role,
        ),
      );
    }

    setIsEditorOpen(false);
  };

  const permissionCount = (role: Role) =>
    Object.values(role.permissions).reduce(
      (total, menuPermissions) =>
        total + Object.values(menuPermissions).filter(Boolean).length,
      0,
    );

  return (
    <>
      <PageMeta
        title="App Permission | Yatzar Operation"
        description="Yatzar Operation app permissions"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.appPermission")} />
      <div className="space-y-6">
        {!isEditorOpen && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <span className="text-lg leading-none">+</span>
            Create role
          </button>
        )}

        {isEditorOpen && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6 dark:border-gray-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <input
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="Role name"
                  aria-label="Role name"
                  className="h-11 w-full max-w-sm border-0 border-b border-gray-300 bg-transparent px-0 text-xl font-semibold text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-500 focus:ring-0 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-gray-500"
                />
                <div className="flex gap-3">
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
                            checked={permissions[name][operation.key]}
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
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Created roles
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {roles.length} roles configured for this application
                </p>
              </div>
              <GridIcon className="size-5 text-gray-400" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roles.map((role) => (
                <article
                  key={role.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                        <ShieldIcon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-800 dark:text-white/90">
                          {role.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {permissionCount(role)} permissions enabled
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(role)}
                        aria-label={`Edit ${role.name}`}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                      >
                        <EditIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(role)}
                        aria-label={`Delete ${role.name}`}
                        className="rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {menuItems.map(({ name }) => {
                      const enabled = Object.values(
                        role.permissions[name],
                      ).filter(Boolean).length;
                      return (
                        <span
                          key={name}
                          className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                        >
                          {name} {enabled}/4
                        </span>
                      );
                    })}
                  </div>
                </article>
              ))}
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
                  setRoles((current) =>
                    current.filter((role) => role.id !== deleteTarget.id),
                  );
                  setDeleteTarget(null);
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
