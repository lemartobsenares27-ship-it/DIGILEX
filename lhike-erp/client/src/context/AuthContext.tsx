import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";

export interface CurrentUser {
  id: string;
  employeeNo: string;
  username: string | null;
  fullName: string;
  position: string | null;
  employmentStatus: string;
  lastLogin: string | null;
  permissions: string[];
  isMotherAccount: boolean;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<CurrentUser>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    await api.post("/auth/login", { username, password });
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  const can = useCallback(
    (permission: string) => Boolean(user?.isMotherAccount || user?.permissions.includes(permission)),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
