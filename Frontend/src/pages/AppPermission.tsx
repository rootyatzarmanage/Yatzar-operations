import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  ContactsIcon,
  ChevronDownIcon,
  EditIcon,
  EyeIcon,
  ShieldIcon,
  TrashIcon,
  FilterIcon,
  UsersIcon,
  WorkspaceIcon,
} from "@/icons";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type Permission = "create" | "view" | "update" | "delete";
type PermissionMap = Record<string, Record<Permission, boolean>>;

type Role = {
  id: number;
  name: string;
  permissions: PermissionMap;
};

type Employee = {
  code: string;
  name: string;
  email: string;
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
      Teams: { create: true, view: true, update: true, delete: true },
      Workspace: { create: true, view: true, update: true, delete: false },
      Contacts: { create: true, view: true, update: true, delete: false },
    },
  },
  {
    id: 3,
    name: "Manager",
    permissions: {
      ...createPermissions(),
      Teams: { create: true, view: true, update: true, delete: false },
      Workspace: { create: false, view: true, update: true, delete: false },
      Contacts: { create: true, view: true, update: true, delete: false },
    },
  },
  {
    id: 4,
    name: "Team Leader",
    permissions: {
      ...createPermissions(),
      Teams: { create: false, view: true, update: true, delete: false },
      Workspace: { create: false, view: true, update: false, delete: false },
      Contacts: { create: false, view: true, update: false, delete: false },
    },
  },
  {
    id: 5,
    name: "Accountant",
    permissions: {
      ...createPermissions(),
      Workspace: { create: true, view: true, update: true, delete: false },
      Contacts: { create: false, view: true, update: false, delete: false },
    },
  },
  {
    id: 6,
    name: "Employee",
    permissions: {
      ...createPermissions(),
      Teams: { create: false, view: true, update: false, delete: false },
      Workspace: { create: false, view: true, update: false, delete: false },
    },
  },
  {
    id: 7,
    name: "Viewer",
    permissions: menuItems.reduce(
      (permissions, { name }) => ({
        ...permissions,
        [name]: { create: false, view: true, update: false, delete: false },
      }),
      {},
    ),
  },
];

const employees: Employee[] = [
  {
    code: "EMP-2026-0001",
    name: "Aarav Mehta",
    email: "aarav.mehta@yatzar.com",
  },
  { code: "EMP-2026-0002", name: "Meera Nair", email: "meera.nair@yatzar.com" },
  { code: "EMP-2026-0003", name: "Kabir Shah", email: "kabir.shah@yatzar.com" },
  { code: "EMP-2026-0004", name: "Anaya Rao", email: "anaya.rao@yatzar.com" },
];

const initialEmployeeRoles: Record<string, string> = {
  "EMP-2026-0001": "Admin",
  "EMP-2026-0002": "Manager",
  "EMP-2026-0003": "Employee",
  "EMP-2026-0004": "Viewer",
};

const tableInputClass =
  "h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent px-3 text-base text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 sm:text-sm dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

function EmployeeRoleDropdown({
  roles,
  value,
  onChange,
  employeeName,
}: {
  roles: Role[];
  value: string;
  onChange: (roleName: string) => void;
  employeeName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRole = roles.find((role) => role.name === value);
  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (!isOpen) return;
    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const opensAbove =
        window.innerHeight - rect.bottom < 360 && rect.top > 360;
      setMenuStyle({
        left: rect.left,
        width: Math.max(rect.width, 360),
        ...(opensAbove
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    };
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    updatePlacement();
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Role for ${employeeName}`}
        className="flex h-9 min-w-40 items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 text-sm font-semibold text-brand-600 outline-none focus:border-brand-500 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-400"
      >
        <span>{selectedRole?.name ?? "Select role"}</span>
        <ChevronDownIcon
          className={`size-4 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="fixed z-9999 max-h-[min(22rem,calc(100vh-1rem))] overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-theme-xl dark:border-gray-800 dark:bg-gray-dark"
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roles..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-gray-200"
            />
            <div className="mt-2 max-h-72 overflow-y-auto">
              {filteredRoles.map((role) => {
                const enabledPermissions = Object.values(
                  role.permissions,
                ).reduce(
                  (total, menuPermissions) =>
                    total +
                    Object.values(menuPermissions).filter(Boolean).length,
                  0,
                );
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      onChange(role.name);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-start hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                      <ShieldIcon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-800 dark:text-white/90">
                        {role.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                        {enabledPermissions} permissions enabled for this role.
                      </span>
                    </span>
                    {role.name === value && (
                      <span className="pt-1 text-sm text-brand-500">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function AppPermission() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [employeeRoles, setEmployeeRoles] =
    useState<Record<string, string>>(initialEmployeeRoles);
  const [permissions, setPermissions] =
    useState<PermissionMap>(createPermissions());

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
    setPermissions(createPermissions());
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
      const previousRole = roles.find((role) => role.id === editingRoleId);
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
      if (previousRole && previousRole.name !== trimmedName) {
        setEmployeeRoles((current) =>
          Object.fromEntries(
            Object.entries(current).map(([employeeCode, assignedRole]) => [
              employeeCode,
              assignedRole === previousRole.name ? trimmedName : assignedRole,
            ]),
          ),
        );
      }
    }

    setIsEditorOpen(false);
  };

  const filteredEmployees = employees
    .filter((employee) => {
      const searchValue = roleSearch.toLowerCase();
      return (
        employee.name.toLowerCase().includes(searchValue) ||
        employee.email.toLowerCase().includes(searchValue)
      );
    })
    .filter(
      (employee) => !roleFilter || employeeRoles[employee.code] === roleFilter,
    )
    .sort((first, second) => {
      const result = first.name.localeCompare(second.name);
      return sortDirection === "asc" ? result : -result;
    });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / pageSize),
  );
  const visibleEmployees = filteredEmployees.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <>
      <PageMeta
        title="App Permission | Yatzar Operation"
        description="Yatzar Operation app permissions"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.appPermission")} />
      <div className="space-y-6">
        {/* {!isEditorOpen && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <span className="text-lg leading-none">+</span>
            Create role
          </button>
        )} */}

        {isEditorOpen && (
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6 dark:border-gray-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <input
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  readOnly={isReadOnly}
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
                            checked={permissions[name][operation.key]}
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
          <section className="max-w-full min-w-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Employee permissions
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Assign created roles to employee accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
              >
                <span className="text-lg leading-none">+</span>
                Create role
              </button>
            </div>
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="relative w-full sm:max-w-md">
                <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                  ⌕
                </span>
                <input
                  value={roleSearch}
                  onChange={(event) => {
                    setRoleSearch(event.target.value);
                    setPage(1);
                  }}
                  className={`${tableInputClass} ps-10`}
                  placeholder="Search team members"
                  aria-label="Search role members"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <label className="flex items-center gap-2">
                  Show
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-gray-700 dark:border-gray-800 dark:text-gray-300"
                  >
                    {[5, 10, 25].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  entries
                </label>
                <span>
                  {filteredEmployees.length} of {employees.length} members
                </span>
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen((current) => !current)}
                      title="Filter roles"
                      aria-label="Filter roles"
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                    >
                      <FilterIcon className="size-5" />
                    </button>
                    {isFilterOpen && (
                      <div className="absolute end-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark">
                        <select
                          value={roleFilter}
                          onChange={(event) => {
                            setRoleFilter(event.target.value);
                            setPage(1);
                            setIsFilterOpen(false);
                          }}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm dark:border-gray-700 dark:text-white/90"
                        >
                          <option value="">All roles</option>
                          {roles.map((role) => (
                            <option key={role.id} value={role.name}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      )
                    }
                    title="Sort roles"
                    aria-label="Sort roles"
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                  >
                    <span className="text-lg leading-none">
                      {sortDirection === "asc" ? "↑↓" : "↓↑"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="custom-scrollbar max-w-full overflow-x-auto">
              <table className="w-full min-w-full text-start sm:min-w-[860px] lg:min-w-full">
                <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                  <tr>
                    <th className="w-20 px-5 py-3 text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      S.No
                    </th>
                    <th className="px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      Member
                    </th>
                    <th className="px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      Email
                    </th>
                    <th className="px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      Role
                    </th>
                    <th className="px-3 py-3 text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {visibleEmployees.map((employee, index) => (
                    <tr
                      key={employee.code}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/2"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400">
                            <span className="text-xs font-semibold">
                              {getInitials(employee.name)}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                            {employee.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {employee.email}
                      </td>
                      <td className="px-6 py-4">
                        <EmployeeRoleDropdown
                          roles={roles}
                          value={employeeRoles[employee.code] ?? ""}
                          onChange={(roleName) =>
                            setEmployeeRoles((current) => ({
                              ...current,
                              [employee.code]: roleName,
                            }))
                          }
                          employeeName={employee.name}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              openView(
                                roles.find(
                                  (role) =>
                                    role.name === employeeRoles[employee.code],
                                ) ?? roles[0],
                              )
                            }
                            aria-label={`View ${employee.name}`}
                            title="View"
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                roles.find(
                                  (role) =>
                                    role.name === employeeRoles[employee.code],
                                ) ?? roles[0],
                              )
                            }
                            aria-label={`Edit ${employee.name}`}
                            title="Edit"
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                          >
                            <EditIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(
                                roles.find(
                                  (role) =>
                                    role.name === employeeRoles[employee.code],
                                ) ?? roles[0],
                              )
                            }
                            aria-label={`Delete ${employee.name}`}
                            title="Delete"
                            className="rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
              <span>
                Showing{" "}
                {filteredEmployees.length ? (page - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(page * pageSize, filteredEmployees.length)} of{" "}
                {filteredEmployees.length} results
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  Rows per page:
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm dark:border-gray-800 dark:text-white/90"
                  >
                    {[5, 10, 20].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  aria-label="Previous page"
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
                >
                  ‹
                </button>
                <span className="min-w-8 text-center font-medium text-gray-800 dark:text-white/90">
                  {page}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  aria-label="Next page"
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
                >
                  ›
                </button>
              </div>
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
