import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setAccessToken, getAccessToken } from "@/lib/api";

interface User {
  userId: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await api<{ user: User }>("/api/auth/me");
        setUser(data.user);
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const data = await api<{ accessToken: string; user: { id: string; username: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    );
    setAccessToken(data.accessToken);
    setUser({ userId: data.user.id, username: data.user.username });
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
