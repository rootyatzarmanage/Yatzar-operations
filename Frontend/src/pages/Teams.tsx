import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  listEmployees,
  updateEmployee,
  type EmployeeRecord,
} from "@/api/employees";
import { listRoles } from "@/api/roles";
import { listOptions } from "@/api/options";
import { listWorkspaces, type Workspace } from "@/api/workspaces";
import {
  getEmployeeWorkspaceIds,
  setEmployeeWorkspaceIds,
} from "@/utils/workspaceAccess";
import { listCountries, listDistricts, listStates } from "@/api/locations";
import {
  saveEmployeeDraft,
  listEmployeeDrafts,
  deleteEmployeeDraft,
  type EmployeeDraft,
} from "@/api/employeeDrafts";
import {
  ChevronDownIcon,
  ContactsIcon,
  EditIcon,
  GridIcon,
  ShieldIcon,
  TrashIcon,
  UploadIcon,
  UsersIcon,
  WorkspaceIcon,
} from "@/icons";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  description?: string;
};
type WorkspaceOption = Pick<Workspace, "id" | "name">;
type Team = {
  id: string;
  code: string;
  name: string;
  type: string;
  department: string;
  location: string;
  status: string;
  email: string;
};
type TeamFormValues = Record<string, string>;
const fieldGroups: {
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  fields: Field[];
}[] = [
  {
    label: "Identity & Registration",
    icon: UsersIcon,
    fields: [
      {
        name: "employee_code",
        label: "Employee code",
        required: true,
        description: "Auto-generated unique code",
      },
      {
        name: "employee_name",
        label: "Employee name",
        required: true,
      },
      {
        name: "display_name",
        label: "Display name",
      },
      {
        name: "employee_type",
        label: "Employee type",
        required: true,
        options: ["Full-time", "Part-time", "Contract", "Intern"],
      },
      {
        name: "date_of_birth",
        label: "Date of birth",
        type: "date",
        required: true,
      },
      {
        name: "gender",
        label: "Gender",
        type: "radio",
        required: true,
        options: ["Male", "Female", "Other"],
      },
      {
        name: "blood_group",
        label: "Blood group",
        options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
      },
      {
        name: "marital_status",
        label: "Marital status",
        options: ["Single", "Married", "Divorced", "Widowed"],
      },
      {
        name: "photo",
        label: "Profile",
        type: "file",
        description: "Upload reference / path",
      },
    ],
  },
  {
    label: "Contact Details",
    icon: ContactsIcon,
    fields: [
      {
        name: "mobile_number",
        label: "Mobile number",
        type: "number",
        required: true,
        description: "Primary contact number",
      },
      {
        name: "alternate_phone",
        label: "Alternate phone",
        type: "number",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        description: "Personal email, validated format",
      },
      {
        name: "emergency_contact_name",
        label: "Emergency contact name",
      },
      {
        name: "emergency_contact_number",
        label: "Emergency contact number",
        type: "number",
      },
    ],
  },
  {
    label: "Address",
    icon: GridIcon,
    fields: [
      {
        name: "address_line1",
        label: "Address line 1",
        required: true,
      },
      { name: "address_line2", label: "Address line 2" },
      { name: "country", label: "Country", required: true, options: [] },
      {
        name: "state",
        label: "State",
        required: true,
        options: [],
      },
      {
        name: "district",
        label: "District",
        required: true,
        options: [],
      },
      {
        name: "pincode",
        label: "Pincode",
        type: "number",
        required: true,
      },
      {
        name: "permanent_address",
        label: "Permanent address",
        type: "conditional-address",
      },
    ],
  },
  {
    label: "Employment Details",
    icon: WorkspaceIcon,
    fields: [
      {
        name: "date_of_joining",
        label: "Date of joining",
        type: "date",
        required: true,
      },
      {
        name: "department",
        label: "Department",
        required: true,
        options: [],
      },
      {
        name: "designation",
        label: "Designation",
        required: true,
      },
      {
        name: "reporting_manager",
        label: "Reporting manager",
        options: [],
      },
      {
        name: "work_location",
        label: "Work location",
        required: true,
      },
      {
        name: "employment_status",
        label: "Employment status",
        required: true,
        options: ["Active", "Inactive", "Resigned", "On Leave"],
      },
    ],
  },
  {
    label: "Statutory / Compliance",
    icon: ShieldIcon,
    fields: [
      {
        name: "aadhar_number",
        label: "Aadhar number",
        required: false,
      },
      {
        name: "pan_number",
        label: "PAN number",
        required: false,
      },
      {
        name: "uan_number",
        label: "UAN number",
      },
      { name: "bank_name", label: "Bank name" },
      {
        name: "account_number",
        label: "Account number",
      },
      { name: "ifsc_code", label: "IFSC code" },
    ],
  },
  {
    label: "Documents / Other",
    icon: GridIcon,
    fields: [
      {
        name: "resume_file",
        label: "Resume file",
        type: "file",
        description: "Upload reference / path",
      },
      {
        name: "id_proof_file",
        label: "ID proof file",
        type: "file",
        description: "Upload reference / path",
      },
      {
        name: "offer_letter_file",
        label: "Offer letter",
        type: "file",
        description: "Upload reference / path",
      },
      {
        name: "experience",
        label: "Experience",
      },
      {
        name: "skills",
        label: "Skills",
      },
      {
        name: "qualifications",
        label: "Qualifications",
      },
      {
        name: "remarks",
        label: "Remarks",
        type: "textarea",
      },
    ],
  },
  {
    label: "Login & Access",
    icon: ShieldIcon,
    fields: [
      {
        name: "login_email",
        label: "Login email",
        type: "email",
        required: true,
      },
      {
        name: "username",
        label: "Username",
        required: true,
      },
      {
        name: "password",
        label: "Password",
        type: "password",
        required: true,
      },
      {
        name: "role",
        label: "Role",
        required: true,
        options: [
          "Super Admin",
          "Admin",
          "Manager",
          "Team Leader",
          "Accountant",
          "Employee",
          "Viewer",
        ],
      },
      {
        name: "workspace_ids",
        label: "Workspace",
        type: "multi-select",
      },
      {
        name: "is_active",
        label: "Active account",
        type: "checkbox",
        required: true,
      },
    ],
  },
];

function employeeToFormValues(employee: EmployeeRecord): TeamFormValues {
  const values = Object.fromEntries(
    fieldGroups
      .flatMap((group) => group.fields)
      .map((field) => [field.name, String(employee[field.name] ?? "")]),
  );
  const workspaceIds = getEmployeeWorkspaceIds(String(employee.login_email ?? ""));
  if (workspaceIds) values.workspace_ids = workspaceIds.join(",");
  return values;
}

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent px-3 text-base text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 sm:text-sm dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800";

function SearchableSelect({
  label,
  options,
  value,
  onChange,
  hasError,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  hasError: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const safeOptions = options.filter(
    (option): option is string =>
      typeof option === "string" && option.trim().length > 0,
  );
  const filteredOptions = safeOptions.filter((option) =>
    option.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !wrapperRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const opensAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const availableHeight = Math.max(
        120,
        Math.min(320, opensAbove ? spaceAbove - gap : spaceBelow - gap),
      );
      setMenuStyle({
        left: rect.left,
        width: rect.width,
        maxHeight: availableHeight,
        ...(opensAbove
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
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
    <div
      ref={wrapperRef}
      className={`relative min-w-0 ${isOpen ? "z-30" : ""}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`${inputClass} ${hasError ? "border-error-500" : ""} flex items-center justify-between text-start`}
      >
        <span
          className={
            value ? "text-gray-800 dark:text-white/90" : "text-gray-400"
          }
        >
          {value || `Select ${label.toLowerCase()}`}
        </span>
        <ChevronDownIcon className="size-4 text-gray-400" />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="fixed z-9999 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${inputClass} h-9 shrink-0`}
              placeholder={`Search ${label.toLowerCase()}`}
            />
            <div className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {filteredOptions.length ? (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setQuery("");
                      setIsOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-start text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    {option}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-gray-400">
                  No results found
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function FieldControl({
  field,
  value = "",
  onValueChange,
  isDifferentAddress = false,
  onDifferentAddressChange,
  hasError = false,
  optionsOverride,
  optionsOverrides,
  addressValues = {},
  onAddressValueChange,
  workspaceOptions = [],
}: {
  field: Field;
  value?: string;
  onValueChange: (value: string) => void;
  isDifferentAddress?: boolean;
  onDifferentAddressChange?: (value: boolean) => void;
  hasError?: boolean;
  optionsOverride?: string[];
  optionsOverrides?: Record<string, string[]>;
  addressValues?: TeamFormValues;
  onAddressValueChange?: (name: string, value: string) => void;
  workspaceOptions?: WorkspaceOption[];
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const workspaceWrapperRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readProfilePhoto = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => onValueChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  const fieldClass = hasError
    ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
    : "";

  useEffect(() => {
    if (!isWorkspaceMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !workspaceWrapperRef.current?.contains(target) &&
        !workspaceMenuRef.current?.contains(target)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isWorkspaceMenuOpen]);

  if (field.type === "multi-select") {
    const selectedIds = new Set(value.split(",").filter(Boolean));
    const filteredWorkspaces = workspaceOptions.filter((workspace) =>
      workspace.name.toLowerCase().includes(workspaceQuery.toLowerCase()),
    );
    const selectedNames = workspaceOptions
      .filter((workspace) => selectedIds.has(workspace.id))
      .map((workspace) => workspace.name);

    return (
      <div ref={workspaceWrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setIsWorkspaceMenuOpen((current) => !current)}
          className={`${inputClass} ${fieldClass} flex items-center justify-between text-start`}
        >
          <span className={selectedNames.length ? "text-gray-800 dark:text-white/90" : "text-gray-400"}>
            {selectedNames.length
              ? selectedNames.length === 1
                ? selectedNames[0]
                : `${selectedNames.length} workspaces selected`
              : "Select workspaces"}
          </span>
          <ChevronDownIcon
            className={`size-4 text-gray-400 transition-transform ${isWorkspaceMenuOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isWorkspaceMenuOpen &&
          createPortal(
            <div
              ref={workspaceMenuRef}
              className="fixed z-9999 w-[min(32rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
              style={(() => {
                const rect = workspaceWrapperRef.current?.getBoundingClientRect();
                return rect
                  ? { left: rect.left, top: rect.bottom + 4, width: rect.width }
                  : undefined;
              })()}
            >
              <input
                value={workspaceQuery}
                onChange={(event) => setWorkspaceQuery(event.target.value)}
                className={`${inputClass} h-9`}
                placeholder="Search workspaces"
                autoFocus
              />
              <div className="mt-1 max-h-52 overflow-y-auto">
                {filteredWorkspaces.length ? (
                  filteredWorkspaces.map((workspace) => (
                    <label
                      key={workspace.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(workspace.id)}
                        onChange={(event) => {
                          const next = new Set(selectedIds);
                          if (event.target.checked) next.add(workspace.id);
                          else next.delete(workspace.id);
                          onValueChange([...next].join(","));
                        }}
                        className="size-4 rounded accent-brand-500"
                      />
                      {workspace.name}
                    </label>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-400">
                    No workspaces found
                  </p>
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  }

  if (field.type === "radio")
    return (
      <div className="flex flex-wrap gap-4 pt-2">
        {field.options?.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
          >
            <input
              type="radio"
              name={field.name}
              value={option}
              checked={value === option}
              onChange={(event) => onValueChange(event.target.value)}
              className="size-4 accent-brand-500"
            />
            {option}
          </label>
        ))}
      </div>
    );
  if (field.type === "checkbox")
    return (
      <label className="flex h-11 items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(event) => onValueChange(String(event.target.checked))}
          className="size-4 rounded accent-brand-500"
        />
        {field.label}
      </label>
    );
  if (field.type === "file")
    return (
      <div
        className={`flex min-h-52 w-full min-w-0 flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-6 text-center transition ${isDragging ? "border-brand-500 bg-brand-50 shadow-focus-ring dark:bg-brand-500/10" : "border-gray-300 bg-gray-50/40 hover:border-brand-400 dark:border-gray-700 dark:bg-white/[0.02] dark:hover:border-brand-500"}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          readProfilePhoto(event.dataTransfer.files?.[0]);
        }}
      >
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gray-200/80 text-gray-700 dark:bg-white/10 dark:text-gray-200">
          <UploadIcon className="size-6" />
        </div>
        <p className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Drag &amp; Drop Files Here
        </p>
        <p className="mt-2 max-w-sm text-sm leading-5 text-gray-600 dark:text-gray-400">
          Drag and drop your PNG, JPG, WebP, SVG images here or browse
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
        >
          Browse File
        </button>
        {selectedFile && (
          <p className="mt-4 max-w-full truncate text-xs text-gray-500 dark:text-gray-400">
            Selected: {selectedFile.name}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          onChange={(event) => readProfilePhoto(event.target.files?.[0])}
          className="hidden"
        />
        {selectedFile && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              onValueChange("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="mt-3 shrink-0 text-sm font-medium text-error-600 hover:text-error-700 dark:text-error-400"
          >
            Delete
          </button>
        )}
      </div>
    );
  if (field.type === "conditional-address") {
    const permanentFields: Field[] = [
      {
        name: "permanent_address_line1",
        label: "Address line 1",
        required: true,
      },
      { name: "permanent_address_line2", label: "Address line 2" },
      {
        name: "permanent_country",
        label: "Country",
        required: true,
        options: [],
      },
      { name: "permanent_state", label: "State", required: true, options: [] },
      {
        name: "permanent_district",
        label: "District",
        required: true,
        options: [],
      },
      {
        name: "permanent_pincode",
        label: "Pincode",
        type: "number",
        required: true,
      },
    ];
    return (
      <div className="space-y-4 md:col-span-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={isDifferentAddress}
            onChange={(event) =>
              onDifferentAddressChange?.(event.target.checked)
            }
            className="size-4 rounded accent-brand-500"
          />
          Permanent address is different from current address
        </label>
        {isDifferentAddress && (
          <div className="grid grid-cols-1 gap-5 rounded-xl border border-gray-200 p-4 md:grid-cols-2 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-800 md:col-span-2 dark:text-white/90">
              Permanent address
            </h4>
            {permanentFields.map((addressField) => (
              <label key={addressField.name}>
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {addressField.label}
                  {addressField.required && (
                    <span className="ms-1 text-error-500">*</span>
                  )}
                </span>
                <FieldControl
                  field={addressField}
                  value={addressValues[addressField.name]}
                  onValueChange={(nextValue) =>
                    onAddressValueChange?.(addressField.name, nextValue)
                  }
                  optionsOverride={optionsOverrides?.[addressField.name]}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (field.options || optionsOverride)
    return (
      <SearchableSelect
        label={field.label}
        options={optionsOverride ?? field.options ?? []}
        value={value}
        onChange={onValueChange}
        hasError={hasError}
      />
    );
  if (field.type === "date")
    return (
      <input
        type="date"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={`Select ${field.label.toLowerCase()}`}
        className={`${inputClass} ${fieldClass}`}
      />
    );
  if (field.type === "textarea")
    return (
      <textarea
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        className={`${inputClass} ${fieldClass} h-24 py-3`}
      />
    );
  return (
    <input
      type={field.type || "text"}
      readOnly={field.name === "employee_code"}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={
        field.name === "employee_code"
          ? "Generated employee ID"
          : `Enter ${field.label.toLowerCase()}`
      }
      className={`${inputClass} ${fieldClass} ${field.name === "employee_code" ? "bg-gray-50 text-gray-500 dark:bg-white/5" : ""}`}
    />
  );
}

export default function Teams() {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [formValues, setFormValues] = useState<TeamFormValues>({});
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);
  const [nextEmployeeCodeNumber, setNextEmployeeCodeNumber] = useState<
    number | null
  >(null);
  const [isDifferentAddress, setIsDifferentAddress] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, boolean>
  >({});
  const [sortKey, setSortKey] = useState<keyof Team>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [reportingManagers, setReportingManagers] = useState<string[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>(
    [],
  );
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [permStates, setPermStates] = useState<string[]>([]);
  const [permDistricts, setPermDistricts] = useState<string[]>([]);
  // Draft support
  const [drafts, setDrafts] = useState<EmployeeDraft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);

  const filteredTeams = teams.filter((team) =>
    Object.values(team).some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  const sortedTeams = [...filteredTeams].sort((first, second) => {
    const comparison = first[sortKey].localeCompare(second[sortKey]);
    return sortDirection === "asc" ? comparison : -comparison;
  });
  const totalPages = Math.max(1, Math.ceil(sortedTeams.length / pageSize));
  const pagedTeams = sortedTeams.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected =
    pagedTeams.length > 0 &&
    pagedTeams.every((team) => selectedCodes.includes(team.code));
  const selectedCount = selectedCodes.filter((code) =>
    teams.some((team) => team.code === code),
  ).length;

  const applyEmployeeRecords = (records: EmployeeRecord[]) => {
    const currentYear = new Date().getFullYear();
    const nextNumber = records.reduce((highest, employee) => {
      const match = employee.employee_code.match(
        new RegExp(`^EMP-${currentYear}-(\\d+)$`),
      );
      return match
        ? Math.max(highest, Number.parseInt(match[1], 10))
        : highest;
    }, 0);
    setNextEmployeeCodeNumber((current) =>
      current === null ? nextNumber + 1 : Math.max(current, nextNumber + 1),
    );
    setTeams(
      records.map((employee) => ({
        id: employee.id,
        code: employee.employee_code,
        name: employee.employee_name,
        type: employee.employee_type,
        department: employee.department,
        location: employee.work_location,
        status: employee.employment_status,
        email: String(employee.login_email || employee.email),
      })),
    );
  };

  const refreshEmployees = async () => {
    setIsLoading(true);
    try {
      applyEmployeeRecords(await listEmployees());
      setApiError("");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to load employees.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDrafts = async () => {
    try {
      setDrafts(await listEmployeeDrafts());
    } catch {
      setDrafts([]);
    }
  };

  useEffect(() => {
    void refreshEmployees();
  }, []);

  useEffect(() => {
    void listWorkspaces()
      .then((workspaces) => setWorkspaceOptions(workspaces))
      .catch(() => setWorkspaceOptions([]));
  }, []);

  useEffect(() => {
    void refreshDrafts();
  }, []);

  useEffect(() => {
    void listRoles()
      .then((roles) => setRoleOptions(roles.map((role) => role.name)))
      .catch(() => setRoleOptions([]));
  }, []);

  useEffect(() => {
    void listCountries()
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    const country = formValues.country;
    if (!country) return setStates([]);
    void listStates(country)
      .then(setStates)
      .catch(() => setStates([]));
  }, [formValues.country]);

  useEffect(() => {
    const country = formValues.country;
    const state = formValues.state;
    if (!country || !state) return setDistricts([]);
    void listDistricts(country, state)
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, [formValues.country, formValues.state]);

  useEffect(() => {
    void Promise.all([
      listOptions("department"),
      listOptions("reporting_manager"),
    ])
      .then(([departmentOptions, managerOptions]) => {
        setDepartments(departmentOptions.map((option) => option.value));
        setReportingManagers(managerOptions.map((option) => option.value));
      })
      .catch(() => {
        setDepartments([]);
        setReportingManagers([]);
      });
  }, [isCreating]);

  useEffect(() => {
    const showList = () => setIsCreating(false);
    window.addEventListener("teams:navigate-list", showList);
    return () => window.removeEventListener("teams:navigate-list", showList);
  }, []);

  useEffect(() => {
    const c = formValues.permanent_country;
    if (!c) return setPermStates([]);
    void listStates(c).then(setPermStates).catch(() => setPermStates([]));
  }, [formValues.permanent_country]);

  useEffect(() => {
    const c = formValues.permanent_country, s = formValues.permanent_state;
    if (!c || !s) return setPermDistricts([]);
    void listDistricts(c, s).then(setPermDistricts).catch(() => setPermDistricts([]));
  }, [formValues.permanent_country, formValues.permanent_state]);

  const updateFormValue = (name: string, value: string) => {
    setFormValues((current) => ({
      ...current,
      [name]: value,
      ...(name === "country" ? { state: "", district: "" } : {}),
      ...(name === "state" ? { district: "" } : {}),
      ...(name === "permanent_country"
        ? { permanent_state: "", permanent_district: "" }
        : {}),
      ...(name === "permanent_state" ? { permanent_district: "" } : {}),
    }));
    setValidationErrors((current) => ({ ...current, [name]: false }));
  };
  const handleSort = (key: keyof Team) => {
    setPage(1);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const nextEmployeeCode = () =>
    `EMP-${new Date().getFullYear()}-${String(nextEmployeeCodeNumber ?? 1).padStart(4, "0")}`;

  const handleCreate = async () => {
    const requiredErrors: Record<string, boolean> = {};
    fieldGroups.forEach((group) => {
      group.fields.forEach((field) => {
        if (!field.required || field.name === "employee_code") return;
        if (editingCode && field.name === "password") return;
        if (field.name === "permanent_address") {
          if (isDifferentAddress) {
            let hasPermanentAddressError = false;
            [
              "permanent_address_line1",
              "permanent_country",
              "permanent_state",
              "permanent_district",
              "permanent_pincode",
            ].forEach((name) => {
              if (!formValues[name]?.trim()) {
                requiredErrors[name] = true;
                hasPermanentAddressError = true;
              }
            });
            if (hasPermanentAddressError) requiredErrors[field.name] = true;
          }
          return;
        }
        if (!formValues[field.name]?.trim() && field.name !== "is_active")
          requiredErrors[field.name] = true;
      });
    });
    setValidationErrors(requiredErrors);
    const firstInvalidTab = fieldGroups.findIndex((group) =>
      group.fields.some((field) => requiredErrors[field.name]),
    );
    if (firstInvalidTab >= 0) {
      setActiveTab(firstInvalidTab);
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        ...formValues,
        is_active: true,
      };
      const workspaceIds = (formValues.workspace_ids ?? "")
        .split(",")
        .filter(Boolean);
      const loginEmail = String(formValues.login_email ?? "");
      setEmployeeWorkspaceIds(loginEmail, workspaceIds);
      delete payload.workspace_ids;
      let savedEmployee: EmployeeRecord;
      if (editingCode) {
        const employee = teams.find((team) => team.code === editingCode);
        if (!employee?.id) throw new Error("Employee id is missing.");
        if (!payload.password) delete payload.password;
        delete payload.employee_code;
        savedEmployee = await updateEmployee(employee.id, payload);
      } else {
        delete payload.employee_code;
        savedEmployee = await createEmployee(payload);
        // The employee is saved, so the draft is no longer needed
        if (draftId) {
          await deleteEmployeeDraft(draftId).catch(() => {});
          setDraftId(null);
          await refreshDrafts();
        }
      }
      if (!savedEmployee.employee_code) {
        throw new Error("The server did not return an employee code.");
      }
      await refreshEmployees();
      setEditingCode(null);
      setDraftId(null);
      setFormValues({});
      setIsDifferentAddress(false);
      setValidationErrors({});
      setIsCreating(false);
      setApiError("");
      setSuccessMessage(
        editingCode
          ? ""
          : `Employee created with code ${savedEmployee.employee_code}.`,
      );
    } catch (error) {
      setSuccessMessage("");
      setApiError(
        error instanceof Error ? error.message : "Unable to save employee.",
      );
    }
  };

  const handleSaveDraft = async () => {
    try {
      // Keep the password and the preview employee code out of the draft
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { employee_code, password, ...safeValues } = formValues;
      await saveEmployeeDraft(safeValues, draftId ?? undefined);
      await refreshDrafts();
      setFormValues({});
      setDraftId(null);
      setIsDifferentAddress(false);
      setValidationErrors({});
      setIsCreating(false);
      setApiError("");
      setSuccessMessage("Draft saved.");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to save draft.",
      );
    }
  };

  const handleResumeDraft = (draft: EmployeeDraft) => {
    setEditingCode(null);
    setDraftId(draft.id);
    setFormValues({
      ...draft.data,
      employee_code: nextEmployeeCode(),
    });
    setIsDifferentAddress(Boolean(draft.data.permanent_address_line1));
    setValidationErrors({});
    setApiError("");
    setSuccessMessage("");
    setActiveTab(0);
    setIsCreating(true);
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteEmployeeDraft(id);
      await refreshDrafts();
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Unable to delete draft.",
      );
    }
  };

  const handleBulkDelete = async () => {
    const teamsToDelete = teams.filter((team) =>
      selectedCodes.includes(team.code),
    );

    if (teamsToDelete.length === 0 || isDeleting) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${teamsToDelete.length} selected employee(s)?`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setApiError("");
    try {
      await Promise.all(
        teamsToDelete.map((team) => {
          if (!team.id) throw new Error("Employee id is missing.");
          return deleteEmployee(team.id);
        }),
      );
      setSelectedCodes([]);
      await refreshEmployees();
      setSuccessMessage(
        `${teamsToDelete.length} employee(s) deleted successfully.`,
      );
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to delete selected employees.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Teams | Yatzar Operations"
        description="Yatzar Operations teams"
      />
      <PageBreadcrumb pageTitle={t("ecommerce.title") || "Teams"} />
      {apiError && (
        <p className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
          {apiError}
        </p>
      )}
      {successMessage && (
        <p className="mb-4 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          {successMessage}
        </p>
      )}
      {!isCreating ? (
        <section className="max-w-full min-w-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Employee information
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage employee records and access in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingCode(null);
                setDraftId(null);
                setFormValues({ employee_code: nextEmployeeCode() });
                setIsDifferentAddress(false);
                setValidationErrors({});
                setSuccessMessage("");
                setActiveTab(0);
                setIsCreating(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              <span className="text-lg leading-none">+</span>Add employee
            </button>
          </div>

          {drafts.length > 0 && (
            <div className="border-b border-gray-200 p-4 sm:p-5 dark:border-gray-800">
              {/* <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                Drafts ({drafts.length})
              </h4> */}
              <div className="flex flex-wrap gap-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => handleResumeDraft(draft)}
                      className="font-medium text-brand-500 hover:text-brand-600"
                    >
                      {draft.data.employee_name || "Untitled draft"}
                    </button>
                    <span className="text-xs text-gray-400">
                      {new Date(draft.updated_at).toLocaleDateString()}
                    </span>
                    {/* <button
                      type="button"
                      onClick={() => void handleDeleteDraft(draft.id)}
                      className="text-error-500 hover:text-error-600"
                      aria-label="Delete draft"
                    >
                      ×
                    </button> */}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
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
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className={`${inputClass} ps-9`}
                placeholder="Search team members"
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
                {isLoading
                  ? "Loading employees..."
                  : `${filteredTeams.length} of ${teams.length} members`}
              </span>
            </div>
          </div>
          {selectedCount > 0 && (
            <div className="flex flex-col gap-3 border-y border-gray-200 bg-blue-50/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/5">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{selectedCount}</strong> selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCodes([])}
                  disabled={isDeleting}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={isDeleting}
                  className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : `Delete ${selectedCount}`}
                </button>
              </div>
            </div>
          )}
          <div className="custom-scrollbar max-w-full overflow-x-auto">
            <table className="w-full min-w-full text-start sm:min-w-165 lg:min-w-full">
              <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2">
                <tr>
                  <th className="w-12 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() =>
                        setSelectedCodes(
                          allVisibleSelected
                            ? selectedCodes.filter(
                                (code) =>
                                  !pagedTeams.some(
                                    (team) => team.code === code,
                                  ),
                              )
                            : [
                                ...new Set([
                                  ...selectedCodes,
                                  ...pagedTeams.map((team) => team.code),
                                ]),
                              ],
                        )
                      }
                      className="size-4 rounded accent-brand-500"
                      aria-label="Select all visible team members"
                    />
                  </th>
                  {[
                    ["Employee", "name", ""],
                    ["Employee code", "code", "hidden sm:table-cell"],
                    ["Type", "type", "hidden md:table-cell"],
                    ["Department", "department", "hidden md:table-cell"],
                    ["Location", "location", "hidden lg:table-cell"],
                    ["Status", "status", ""],
                    ["Login email", "email", "hidden lg:table-cell"],
                  ]
                    .map((heading) =>
                      typeof heading === "string" ? (
                        <th
                          key={heading}
                          className={`px-3 py-3 text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400 ${heading[2]}`}
                        >
                          {heading}
                        </th>
                      ) : (
                        <th
                          key={heading[1]}
                          className={`px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400 ${heading[2]}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSort(heading[1] as keyof Team)}
                            className="inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-white"
                          >
                            {heading[0]}
                            <span className="text-[10px]">
                              {sortKey === heading[1]
                                ? sortDirection === "asc"
                                  ? "↑"
                                  : "↓"
                                : "↕"}
                            </span>
                          </button>
                        </th>
                      ),
                    )
                    .filter(Boolean)
                    .map((heading) => heading)}
                  <th className="px-3 py-3 text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pagedTeams.map((team) => (
                  <tr
                    key={team.code}
                    className="transition hover:bg-gray-50 dark:hover:bg-white/2"
                  >
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCodes.includes(team.code)}
                        onChange={() =>
                          setSelectedCodes((current) =>
                            current.includes(team.code)
                              ? current.filter((code) => code !== team.code)
                              : [...current, team.code],
                          )
                        }
                        className="size-4 rounded accent-brand-500"
                        aria-label={`Select ${team.name}`}
                      />
                    </td>
                    <td className="px-3 py-4 text-sm font-medium text-gray-800 sm:px-5 dark:text-white/90">
                      {team.name}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-5 dark:text-gray-400">
                      {team.code}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-600 sm:px-5 md:table-cell dark:text-gray-300">
                      {team.type}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-600 sm:px-5 md:table-cell dark:text-gray-300">
                      {team.department}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-600 sm:px-5 lg:table-cell dark:text-gray-300">
                      {team.location}
                    </td>
                    <td className="px-3 py-4 sm:px-5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${team.status === "Active" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"}`}
                      >
                        {team.status}
                      </span>
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 sm:px-5 lg:table-cell dark:text-gray-400">
                      {team.email}
                    </td>
                    <td className="px-3 py-4 sm:px-5">
                      <div className="flex items-center gap-1 text-sm font-medium sm:gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            void (async () => {
                              setApiError("");
                              setSuccessMessage("");
                              setDraftId(null);
                              setIsLoadingEmployee(true);
                              setIsCreating(true);
                              setEditingCode(team.code);
                              setValidationErrors({});
                              setActiveTab(0);
                              try {
                                const employee = await getEmployee(team.id);
                                setFormValues(employeeToFormValues(employee));
                                setIsDifferentAddress(
                                  Boolean(employee.permanent_address_line1),
                                );
                              } catch (error) {
                                setIsCreating(false);
                                setEditingCode(null);
                                setApiError(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to load employee details.",
                                );
                              } finally {
                                setIsLoadingEmployee(false);
                              }
                            })();
                          }}
                          className="rounded-md p-1.5 text-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          aria-label={`Edit ${team.name}`}
                          title="Edit"
                        >
                          <EditIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(team)}
                          className="rounded-md p-1.5 text-error-500 hover:bg-error-50 hover:text-error-600 dark:text-error-400 dark:hover:bg-error-500/10"
                          aria-label={`Delete ${team.name}`}
                          title="Delete"
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
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{selectedCount} selected</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`size-9 rounded-lg border text-sm font-medium ${page === pageNumber ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"}`}
                    aria-current={page === pageNumber ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="max-w-full min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {editingCode ? "Update employee" : "Add employee"}
              </h3>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setDraftId(null);
                  setEditingCode(null);
                  setFormValues({});
                  setIsDifferentAddress(false);
                  setValidationErrors({});
                }}
                className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:px-4 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              {!editingCode && (
                <button
                  type="button"
                  onClick={() => void handleSaveDraft()}
                  className="h-10 flex-1 rounded-lg border border-brand-200 px-3 text-sm font-medium text-brand-600 hover:bg-brand-50 sm:flex-none sm:px-4 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                  Save as draft
                </button>
              )}
              <button
                type="button"
                onClick={handleCreate}
                disabled={isLoadingEmployee}
                className="h-10 flex-1 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 sm:flex-none sm:px-4"
              >
                {isLoadingEmployee ? "Loading..." : "Submit"}
              </button>
            </div>
          </div>
          <div className="max-w-full overflow-x-auto border-b border-gray-200 px-4 sm:px-5 dark:border-gray-800">
            <div className="flex min-w-max gap-6">
              {fieldGroups.map((group, index) => {
                const Icon = group.icon;
                return (
                  <button
                    key={group.label}
                    type="button"
                    onClick={() => setActiveTab(index)}
                    className={`relative flex items-center gap-2 py-4 text-sm font-medium transition ${activeTab === index ? "text-brand-500" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"}`}
                  >
                    <Icon className="size-4" />
                    {group.label}
                    {activeTab === index && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-5 md:p-7">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {activeTab === 2 && (
                <h4 className="text-sm font-semibold text-gray-800 md:col-span-2 dark:text-white/90">
                  Current address
                </h4>
              )}
              {fieldGroups[activeTab].fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.type === "textarea" ||
                    field.type === "conditional-address"
                      ? "md:col-span-2"
                      : ""
                  }
                >
                  <span
                    className={`mb-2 block text-sm font-medium ${validationErrors[field.name] ? "text-error-500" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {field.label}
                    {field.required && (
                      <span className="ms-1 text-error-500">*</span>
                    )}
                  </span>
                  <FieldControl
                    field={field}
                    value={formValues[field.name]}
                    onValueChange={(value) =>
                      updateFormValue(field.name, value)
                    }
                    isDifferentAddress={isDifferentAddress}
                    onDifferentAddressChange={(value) => {
                      setIsDifferentAddress(value);
                      if (!value) {
                        [
                          "permanent_address_line1",
                          "permanent_address_line2",
                          "permanent_country",
                          "permanent_state",
                          "permanent_district",
                          "permanent_pincode",
                        ].forEach((name) => updateFormValue(name, ""));
                      }
                    }}
                    addressValues={formValues}
                    onAddressValueChange={updateFormValue}
                    hasError={Boolean(validationErrors[field.name])}
                    workspaceOptions={workspaceOptions}
                    optionsOverride={
                      field.name === "country"
                        ? countries
                        : field.name === "state"
                          ? states
                          : field.name === "district"
                            ? districts
                            : field.name === "department"
                              ? departments
                              : field.name === "reporting_manager"
                                ? reportingManagers
                                : field.name === "role"
                                  ? roleOptions
                                  : undefined
                    }
                    optionsOverrides={{
                      permanent_country: countries,
                      permanent_state: permStates,
                      permanent_district: permDistricts,
                    }}
                  />
                  {validationErrors[field.name] && (
                    <span className="mt-1.5 block text-xs text-error-500">
                      This field is required.
                    </span>
                  )}
                  {field.description && (
                    <span className="mt-1.5 block text-xs text-gray-400">
                      {field.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={activeTab === fieldGroups.length - 1}
                onClick={() =>
                  setActiveTab((current) =>
                    Math.min(fieldGroups.length - 1, current + 1),
                  )
                }
                className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-950/40 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xl dark:border-gray-800 dark:bg-gray-dark"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-team-title"
          >
            <h3
              id="delete-team-title"
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              Delete team member?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This will deactivate {deleteTarget.name} and remove them from the
              active directory.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              {/* <button
                type="button"
                onClick={() => {
                  void (async () => {
                    try {
                      if (!deleteTarget.id)
                        throw new Error("Employee id is missing.");
                      await deleteEmployee(deleteTarget.id);
                      await refreshEmployees();
                      setSelectedCodes((current) =>
                        current.filter((code) => code !== deleteTarget.code),
                      );
                      setDeleteTarget(null);
                    } catch (error) {
                      setApiError(
                        error instanceof Error
                          ? error.message
                          : "Unable to delete employee.",
                      );
                    }
                  })();
                }}
                className="h-10 rounded-lg bg-error-500 px-4 text-sm font-medium text-white hover:bg-error-600"
              >
                Delete
              </button> */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}