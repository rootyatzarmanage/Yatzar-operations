import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const storageKey = "yatzar-operations.current-workspace.v1";

type WorkspaceContextType = {
  currentWorkspace: string | null;
  enterWorkspace: (name: string) => void;
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
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(
    () => {
      try {
        return window.localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
  );

  const enterWorkspace = useCallback((name: string) => {
    setCurrentWorkspace(name);
    try {
      window.localStorage.setItem(storageKey, name);
    } catch {
      // Storage unavailable: the workspace still opens for this session.
    }
  }, []);

  const leaveWorkspace = useCallback(() => {
    setCurrentWorkspace(null);
    try {
      window.localStorage.removeItem(storageKey);
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
