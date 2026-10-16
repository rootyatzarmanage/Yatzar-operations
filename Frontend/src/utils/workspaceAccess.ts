const accessStorageKey = "yatzar-operations.employee-workspaces.v1";

type WorkspaceAssignments = Record<string, string[]>;

function readAssignments(): WorkspaceAssignments {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(accessStorageKey) ?? "{}",
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([email, ids]) =>
          email.trim().length > 0 &&
          Array.isArray(ids) &&
          ids.every((id) => typeof id === "string"),
      ),
    ) as WorkspaceAssignments;
  } catch {
    return {};
  }
}

export function getEmployeeWorkspaceIds(email: string): string[] | null {
  const assignments = readAssignments();
  const normalizedEmail = email.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(assignments, normalizedEmail)
    ? assignments[normalizedEmail]
    : null;
}

export function setEmployeeWorkspaceIds(
  email: string,
  workspaceIds: string[],
): void {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  try {
    const assignments = readAssignments();
    assignments[normalizedEmail] = [...new Set(workspaceIds)];
    window.localStorage.setItem(accessStorageKey, JSON.stringify(assignments));
  } catch {
    // Keep the form usable when browser storage is unavailable.
  }
}
