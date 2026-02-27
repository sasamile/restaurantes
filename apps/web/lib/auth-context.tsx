"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
}

const STORAGE_KEY = "restaurantes_saas_user";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    return parsed?._id ? parsed : null;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUserState(loadUser());
    setIsLoading(false);
  }, []);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
    saveUser(u);
  }, []);

  const login = useCallback((u: AuthUser) => {
    setUser(u);
  }, [setUser]);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
