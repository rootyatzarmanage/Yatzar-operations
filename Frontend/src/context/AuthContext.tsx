import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentUser, loginRequest, logoutRequest, getAuthToken, setAuthToken, type AuthUser } from "@/api/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export function hasPermission(
  user: AuthUser | null,
  menu: string,
  action: "create" | "view" | "update" | "delete" = "view",
) {
  const normalizeMenu = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const expectedMenu = normalizeMenu(menu);
  return user?.permissions?.some(
    (permission) => normalizeMenu(permission.menu) === expectedMenu && permission[action],
  ) ?? false;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      setUser(await getCurrentUser());
    } catch {
      // Keep the current session UI during transient connectivity failures.
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        setUser(null);
        setAuthToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const refreshWhenActive = () => {
      if (document.visibilityState === "visible") void refreshUser();
    };
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    window.addEventListener("auth:permissions-updated", refreshWhenActive);
    return () => {
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
      window.removeEventListener("auth:permissions-updated", refreshWhenActive);
    };
  }, [refreshUser]);

  const signIn = async (identifier: string, password: string) => {
    const authenticatedUser = await loginRequest(identifier, password);
    setUser(authenticatedUser);
  };

  const signOut = async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setAuthToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
