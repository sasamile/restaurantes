"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import Link from "next/link";

export default function TenantsPage() {
  const { user } = useAuth();
  const { tenantId, setTenantId } = useTenant();
  const memberships = useQuery(
    api.users.getTenantsForUser,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );

  const tenants = memberships
    ?.map((m) => m.tenant)
    .filter((t): t is NonNullable<typeof t> => t != null) ?? [];

  useEffect(() => {
    if (memberships && memberships.length === 1 && memberships[0]?.tenant) {
      setTenantId(memberships[0].tenant._id);
    }
  }, [memberships, setTenantId]);

  const tenant = useQuery(
    api.tenants.get,
    tenantId ? { tenantId } : "skip"
  );
  const ycloud = useQuery(
    api.integrations.getYCloud,
    tenantId ? { tenantId } : "skip"
  );

  const greeting =
    new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 18 ? "Buenas tardes" : "Buenas noches";

  if (memberships === undefined || (memberships.length === 1 && !tenantId)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">Cargando panel...</p>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">No tienes acceso a ningún restaurante.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* Dashboard del restaurante */}
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Dashboard
        </h2>
        <p className="text-slate-500 mt-1">
          {greeting}, {user?.name ?? "Usuario"}. Panel de {tenant?.name ?? "tu restaurante"}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined">restaurant</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Restaurante
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {tenant?.name ?? "—"}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#197fe6]">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Tu rol
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {memberships?.[0]?.role ?? "—"}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="size-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <span className="material-symbols-outlined">mail</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Inbox
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {ycloud?.connected ? (
              <Link href="/tenants/inbox" className="text-[#197fe6] hover:underline text-sm">
                Ir al inbox
              </Link>
            ) : (
              <Link href="/tenants/integraciones" className="text-amber-600 hover:underline text-sm">
                Conectar YCloud
              </Link>
            )}
          </h3>
        </div>
      </div>
    </div>
  );
}
