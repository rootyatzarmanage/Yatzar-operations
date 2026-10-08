import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentUser, loginRequest, logoutRequest, getAuthToken, setAuthToken, type AuthUser } from "@/api";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
