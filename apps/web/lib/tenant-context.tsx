"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Id } from "@/convex";

const TENANT_KEY = "restoadmin_tenant_id";

interface TenantContextValue {
  tenantId: Id<"tenants"> | null;
  setTenantId: (id: Id<"tenants"> | null) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<Id<"tenants"> | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(TENANT_KEY) : null;
    if (stored) {
      setTenantIdState(stored as Id<"tenants">);
    }
    setHydrated(true);
  }, []);

  const setTenantId = useCallback((id: Id<"tenants"> | null) => {
    setTenantIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(TENANT_KEY, id);
      } else {
        localStorage.removeItem(TENANT_KEY);
      }
    }
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId: hydrated ? tenantId : null, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
