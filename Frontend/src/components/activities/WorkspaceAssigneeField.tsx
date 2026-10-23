import { listEmployees, type EmployeeRecord } from "@/api/employees";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useEffect, useState } from "react";

export type WorkspaceMember = { id: string; name: string };

export function useWorkspaceMembers(): WorkspaceMember[] {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  useEffect(() => {
    let active = true;
    setMembers([]);
    if (!currentWorkspace?.id) return () => { active = false; };

    void listEmployees()
      .then((employees: EmployeeRecord[]) => {
        const workspaceMembers = employees
          .filter((employee) => employee.status === 1 && employee.user_id &&
            employee.workspaces?.some((workspace) => workspace.id === currentWorkspace.id))
          .map((employee) => ({
            id: employee.user_id as string,
            name: employee.display_name?.trim() || employee.employee_name?.trim() || employee.username?.trim() || employee.login_email?.trim() || employee.email?.trim() || "Unnamed user",
          }));

        // The signed-in user has access to the active workspace and can be shown
        // even when their role cannot read the Teams directory.
        if (user?.id && !workspaceMembers.some((member) => member.id === user.id)) {
          workspaceMembers.push({
            id: user.id,
            name: user.display_name || user.employee_name || user.username || user.email,
          });
        }
        if (active) setMembers(workspaceMembers);
      })
      .catch(() => {
        if (active && user?.id) {
          setMembers([{ id: user.id, name: user.display_name || user.employee_name || user.username || user.email }]);
        }
      });

    return () => { active = false; };
  }, [currentWorkspace?.id, user]);

  return members;
}

export default function WorkspaceAssigneeField({
  id,
  value,
  members,
  onChange,
}: {
  id: string;
  value: string;
  members: WorkspaceMember[];
  onChange: (userId: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Assigned to
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90"
      >
        <option value="">Select a workspace user</option>
        {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        {!members.length && <option value="" disabled>No workspace users available</option>}
      </select>
    </div>
  );
}
