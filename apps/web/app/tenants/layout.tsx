"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { TenantProvider } from "@/lib/tenant-context";
import { TenantsShell } from "../../components/tenants-shell";

export default function TenantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f8]">
        <div className="text-slate-600">Cargando...</div>
      </div>
    );
  }

  return (
    <TenantProvider>
      <TenantsShell>{children}</TenantsShell>
    </TenantProvider>
  );
}
