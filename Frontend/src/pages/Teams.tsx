import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  ChevronDownIcon,
  ContactsIcon,
  EditIcon,
  GridIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
  WorkspaceIcon,
} from "@/icons";
import { getTeamDropdownOptions } from "@/utils/teamOptions";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  description?: string;
};
type Team = {
  code: string;
  name: string;
  type: string;
  department: string;
  location: string;
  status: string;
  email: string;
};
type TeamFormValues = Record<string, string>;
type LocationData = { name: string };

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
      { name: "blood_group", label: "Blood group" },
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
        type: "conditional-text",
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
        name: "is_active",
        label: "Active account",
        type: "checkbox",
        required: true,
      },
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
        name: "skills_qualification",
        label: "Skills & qualification",
      },
      {
        name: "remarks",
        label: "Remarks",
        type: "textarea",
      },
    ],
  },
];

const teamRows: Team[] = [
  {
    code: "EMP-2026-0001",
    name: "Aarav Mehta",
    type: "Full-time",
    department: "Operations",
    location: "Mumbai HQ",
    status: "Active",
    email: "aarav.mehta@yatzar.com",
  },
  {
    code: "EMP-2026-0002",
    name: "Meera Nair",
    type: "Full-time",
    department: "Finance",
    location: "Bengaluru",
    status: "Active",
    email: "meera.nair@yatzar.com",
  },
  {
    code: "EMP-2026-0003",
    name: "Kabir Shah",
    type: "Contract",
    department: "Technology",
    location: "Pune",
    status: "On Leave",
    email: "kabir.shah@yatzar.com",
  },
  {
    code: "EMP-2026-0004",
    name: "Anaya Rao",
    type: "Part-time",
    department: "People",
    location: "Delhi",
    status: "Active",
    email: "anaya.rao@yatzar.com",
  },
];

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent px-3 text-base text-gray-800 shadow-theme-xs outline-none transition focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 sm:text-sm dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:focus:border-brand-800";
const fallbackStates = ["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi"];
const fallbackDistricts = ["Mumbai", "Bengaluru Urban", "Chennai", "New Delhi"];

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
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const updatePlacement = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 4,
        width: rect.width,
      });
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", updatePlacement);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", updatePlacement);
    };
  }, [isOpen]);
  return (
    <div ref={wrapperRef} className="relative min-w-0">
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
      {isOpen && (
        <div
          style={menuStyle}
          className="z-9999 rounded-lg border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputClass} h-9`}
            placeholder={`Search ${label.toLowerCase()}`}
          />
          <div className="mt-1 max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain">
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
        </div>
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
}: {
  field: Field;
  value?: string;
  onValueChange: (value: string) => void;
  isDifferentAddress?: boolean;
  onDifferentAddressChange?: (value: boolean) => void;
  hasError?: boolean;
  optionsOverride?: string[];
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldClass = hasError
    ? "border-error-500 focus:border-error-500 focus:ring-error-500/10"
    : "";

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
          defaultChecked
          className="size-4 rounded accent-brand-500"
        />
        Is active
      </label>
    );
  if (field.type === "file")
    return (
      <div
        className={`flex min-h-32 w-full min-w-0 flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition ${isDragging ? "border-brand-500 bg-brand-50 shadow-focus-ring dark:bg-brand-500/10" : "border-gray-300 hover:border-brand-400 dark:border-gray-700 dark:hover:border-brand-500"}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          setSelectedFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Drop your file here or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-brand-500 underline underline-offset-2 hover:text-brand-600"
          >
            Browse file
          </button>
        </p>
        <p className="mt-2 truncate text-xs text-gray-400">
          {selectedFile?.name ?? "No file chosen"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          className="hidden"
        />
        {selectedFile && (
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="shrink-0 text-sm font-medium text-error-600 hover:text-error-700 dark:text-error-400"
          >
            Delete
          </button>
        )}
      </div>
    );
  if (field.type === "conditional-text")
    return (
      <div className="space-y-3">
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
        <input
          type="text"
          disabled={!isDifferentAddress}
          required={isDifferentAddress}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          className={`${inputClass} ${fieldClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/5`}
        />
      </div>
    );
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
      value={field.name === "employee_code" ? "EMP-2026-0048" : value}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={`Enter ${field.label.toLowerCase()}`}
      className={`${inputClass} ${fieldClass} ${field.name === "employee_code" ? "bg-gray-50 text-gray-500 dark:bg-white/5" : ""}`}
    />
  );
}

export default function Teams() {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [teams, setTeams] = useState(teamRows);
  const [formValues, setFormValues] = useState<TeamFormValues>({});
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isDifferentAddress, setIsDifferentAddress] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, boolean>
  >({});
  const [sortKey, setSortKey] = useState<keyof Team>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [departments, setDepartments] = useState(
    () => getTeamDropdownOptions().departments,
  );
  const [reportingManagers, setReportingManagers] = useState(
    () => getTeamDropdownOptions().reportingManagers,
  );
  const [countries, setCountries] = useState<string[]>([
    "India",
    "United States",
    "United Kingdom",
    "Singapore",
  ]);
  const [states, setStates] = useState<string[]>(fallbackStates);
  const [districts, setDistricts] = useState<string[]>(fallbackDistricts);
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

  useEffect(() => {
    fetch("https://countriesnow.space/api/v0.1/countries")
      .then((response) => response.json())
      .then((result: { data?: LocationData[] }) =>
        setCountries(
          result.data
            ?.map((item) => item.name)
            .filter(
              (name): name is string =>
                typeof name === "string" && name.trim().length > 0,
            ) ?? [],
        ),
      )
      .catch(() =>
        setCountries(["India", "United States", "United Kingdom", "Singapore"]),
      );
  }, []);

  useEffect(() => {
    const country = formValues.country;
    if (!country) return setStates(fallbackStates);
    fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country }),
    })
      .then((response) => response.json())
      .then((result: { data?: { states?: LocationData[] } }) =>
        setStates(
          result.data?.states
            ?.map((item) => item.name)
            .filter(
              (name): name is string =>
                typeof name === "string" && name.trim().length > 0,
            ) || fallbackStates,
        ),
      )
      .catch(() =>
        setStates(["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi"]),
      );
  }, [formValues.country]);

  useEffect(() => {
    const country = formValues.country;
    const state = formValues.state;
    if (!country || !state) return setDistricts(fallbackDistricts);
    fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, state }),
    })
      .then((response) => response.json())
      .then((result: { data?: string[] }) =>
        setDistricts(result.data?.length ? result.data : fallbackDistricts),
      )
      .catch(() =>
        setDistricts(["Mumbai", "Bengaluru Urban", "Chennai", "New Delhi"]),
      );
  }, [formValues.country, formValues.state]);

  useEffect(() => {
    const options = getTeamDropdownOptions();
    setDepartments(options.departments);
    setReportingManagers(options.reportingManagers);
  }, [isCreating]);

  useEffect(() => {
    const showList = () => setIsCreating(false);
    window.addEventListener("teams:navigate-list", showList);
    return () => window.removeEventListener("teams:navigate-list", showList);
  }, []);

  const updateFormValue = (name: string, value: string) => {
    setFormValues((current) => ({
      ...current,
      [name]: value,
      ...(name === "country" ? { state: "", district: "" } : {}),
      ...(name === "state" ? { district: "" } : {}),
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

  const handleCreate = () => {
    const requiredErrors: Record<string, boolean> = {};
    fieldGroups.forEach((group) => {
      group.fields.forEach((field) => {
        if (!field.required || field.name === "employee_code") return;
        if (field.name === "permanent_address") {
          if (isDifferentAddress && !formValues[field.name]?.trim())
            requiredErrors[field.name] = true;
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
    const name = formValues.employee_name?.trim() || "New team member";
    if (editingCode) {
      setTeams((current) =>
        current.map((team) =>
          team.code === editingCode
            ? {
                ...team,
                name,
                type: formValues.employee_type || team.type,
                department: formValues.department || team.department,
                location: formValues.work_location || team.location,
                status: formValues.employment_status || team.status,
                email: formValues.login_email || formValues.email || team.email,
              }
            : team,
        ),
      );
      setEditingCode(null);
      setFormValues({});
      setIsDifferentAddress(false);
      setValidationErrors({});
      setIsCreating(false);
      return;
    }
    const nextNumber = teams.length + 1;
    setTeams((current) => [
      ...current,
      {
        code: `EMP-2026-${String(nextNumber).padStart(4, "0")}`,
        name,
        type: formValues.employee_type || "Full-time",
        department: formValues.department || "Operations",
        location: formValues.work_location || "Unassigned",
        status: formValues.employment_status || "Active",
        email: formValues.login_email || formValues.email || "Not provided",
      },
    ]);
    setFormValues({});
    setIsDifferentAddress(false);
    setValidationErrors({});
    setIsCreating(false);
    setPage(totalPages);
  };

  return (
    <>
      <PageMeta
        title="Teams | Yatzar Operation"
        description="Yatzar Operation teams"
      />
      <PageBreadcrumb pageTitle={t("ecommerce.title") || "Teams"} />
      {!isCreating ? (
        <section className="max-w-full min-w-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Team directory
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage employee records and access in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingCode(null);
                setFormValues({});
                setIsDifferentAddress(false);
                setValidationErrors({});
                setActiveTab(0);
                setIsCreating(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
            >
              <span className="text-lg leading-none">+</span>Add
            </button>
          </div>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-gray-400">
                ⌕
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
                {filteredTeams.length} of {teams.length} members
              </span>
            </div>
          </div>
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
                            setEditingCode(team.code);
                            setValidationErrors({});
                            setIsDifferentAddress(false);
                            setFormValues({
                              employee_name: team.name,
                              employee_type: team.type,
                              department: team.department,
                              work_location: team.location,
                              employment_status: team.status,
                              login_email: team.email,
                            });
                            setIsCreating(true);
                            setActiveTab(0);
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
              <span>{selectedCodes.length} selected</span>
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
                {editingCode ? "Update team member" : "Add team member"}
              </h3>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:flex-none sm:px-4 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="h-10 flex-1 rounded-lg border border-brand-200 px-3 text-sm font-medium text-brand-600 hover:bg-brand-50 sm:flex-none sm:px-4 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                Save as draft
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="h-10 flex-1 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 sm:flex-none sm:px-4"
              >
                {editingCode ? "Update" : "Save/Submit"}
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
            {/* <div className="mb-6 flex items-start gap-3">
              <div className="rounded-lg bg-brand-50 p-2.5 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <UsersIcon className="size-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-white/90">
                  {fieldGroups[activeTab].label}
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Fields marked with <span className="text-error-500">*</span>{" "}
                  are required.
                </p>
              </div>
            </div> */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {fieldGroups[activeTab].fields.map((field) => (
                <label
                  key={field.name}
                  className={field.type === "textarea" ? "md:col-span-2" : ""}
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
                      if (!value) updateFormValue("permanent_address", "");
                    }}
                    hasError={Boolean(validationErrors[field.name])}
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
                                : undefined
                    }
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
                </label>
              ))}
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
              This will remove {deleteTarget.name} from the mock team directory.
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
                  setTeams((current) =>
                    current.filter((team) => team.code !== deleteTarget.code),
                  );
                  setSelectedCodes((current) =>
                    current.filter((code) => code !== deleteTarget.code),
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
