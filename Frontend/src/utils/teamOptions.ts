export const DEFAULT_DEPARTMENTS = [
  "Operations",
  "Finance",
  "Technology",
  "People",
];

export const DEFAULT_REPORTING_MANAGERS = [
  "Musharof Chowdhury",
  "Aarav Mehta",
  "Meera Nair",
];

const STORAGE_KEY = "yatzar-team-dropdown-options";

type TeamDropdownOptions = {
  departments: string[];
  reportingManagers: string[];
};

function validOptions(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const options = value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
  return options.length ? options : fallback;
}

export function getTeamDropdownOptions(): TeamDropdownOptions {
  if (typeof window === "undefined") {
    return {
      departments: DEFAULT_DEPARTMENTS,
      reportingManagers: DEFAULT_REPORTING_MANAGERS,
    };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) throw new Error("No saved team options");
    const parsed = JSON.parse(stored) as Partial<TeamDropdownOptions>;
    return {
      departments: validOptions(parsed.departments, DEFAULT_DEPARTMENTS),
      reportingManagers: validOptions(
        parsed.reportingManagers,
        DEFAULT_REPORTING_MANAGERS,
      ),
    };
  } catch {
    return {
      departments: DEFAULT_DEPARTMENTS,
      reportingManagers: DEFAULT_REPORTING_MANAGERS,
    };
  }
}

export function saveTeamDropdownOptions(options: TeamDropdownOptions) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
}
