import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const workspaceStorageKey = "yatzar-operations.current-workspace.v1";
type CurrentWorkspace = {
  id: string;
  name: string;
};
type WorkspaceContextType = {
  currentWorkspace: CurrentWorkspace | null;
  enterWorkspace: (workspace: CurrentWorkspace) => void;
  leaveWorkspace: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [currentWorkspace, setCurrentWorkspace] =
    useState<CurrentWorkspace | null>(() => {
      try {
        const stored = window.localStorage.getItem(workspaceStorageKey);
        if (!stored) return null;

        const parsed: unknown = JSON.parse(stored);

        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "id" in parsed &&
          "name" in parsed &&
          typeof parsed.id === "string" &&
          typeof parsed.name === "string"
        ) {
          return {
            id: parsed.id,
            name: parsed.name,
          };
        }

        return null;
      } catch {
        return null;
      }
    });

  const enterWorkspace = useCallback((workspace: CurrentWorkspace) => {
    setCurrentWorkspace(workspace);

    try {
      window.localStorage.setItem(workspaceStorageKey, JSON.stringify(workspace));
    } catch {
      // Storage unavailable: the workspace still opens for this session.
    }
  }, []);

  const leaveWorkspace = useCallback(() => {
    setCurrentWorkspace(null);

    try {
      window.localStorage.removeItem(workspaceStorageKey);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const value = useMemo(
    () => ({ currentWorkspace, enterWorkspace, leaveWorkspace }),
    [currentWorkspace, enterWorkspace, leaveWorkspace],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
