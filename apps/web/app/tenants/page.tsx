"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { useAuth } from "@/lib/auth-context";
import { useTenant } from "@/lib/tenant-context";
import Link from "next/link";
import {
  MessageSquare,
  MessageCircle,
  TrendingUp,
  Bot,
  Mail,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KPICard } from "@/components/dashboard/kpi-card";
import { SparklineChart } from "@/components/dashboard/sparkline-chart";
import { IntegrationsStatus } from "@/components/dashboard/integrations-status";
import { IntegrationBanner } from "@/components/dashboard/integration-banner";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";

const DEFAULT_PRIMARY = "#197fe6";
const DEFAULT_SECONDARY = "#06b6d4";

const RANGE_OPTIONS = [
  { value: 1, label: "Hoy" },
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
];

export default function TenantsPage() {
  const { user } = useAuth();
  const { tenantId, setTenantId } = useTenant();
  const [rangeDays, setRangeDays] = React.useState(7);
  const [rangeDropdownOpen, setRangeDropdownOpen] = React.useState(false);

  const memberships = useQuery(
    api.users.getTenantsForUser,
    user?._id ? { userId: user._id as Id<"users"> } : "skip"
  );

  const tenants =
    memberships
      ?.map((m) => m.tenant)
      .filter((t): t is NonNullable<typeof t> => t != null) ?? [];

  React.useEffect(() => {
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
  const stats = useQuery(
    api.dashboard.getStats,
    tenantId ? { tenantId, rangeDays } : "skip"
  );

  const primaryColor = tenant?.primaryColor ?? DEFAULT_PRIMARY;
  const secondaryColor = tenant?.secondaryColor ?? DEFAULT_SECONDARY;
  const ycloudConnected = ycloud?.connected ?? false;

  const greeting =
    new Date().getHours() < 12
      ? "Buenos días"
      : new Date().getHours() < 18
        ? "Buenas tardes"
        : "Buenas noches";

  const firstName = user?.name?.split(/\s+/)[0] ?? "Usuario";

  const activities = React.useMemo(() => {
    const list: { type: "conversation" | "user_invited" | "integration_connected" | "escalated"; title: string; description?: string; time: number; href?: string }[] = [];
    if (stats?.recentConversations) {
      for (const c of stats.recentConversations) {
        list.push({
          type: c.assignedTo ? "escalated" : "conversation",
          title: c.assignedTo ? `Escalada: ${c.customerName}` : c.customerName,
          description: c.status === "open" ? "Abierta" : "Cerrada",
          time: c.lastMessageAt,
          href: "/tenants/inbox",
        });
      }
    }
    return list.sort((a, b) => b.time - a.time);
  }, [stats?.recentConversations]);

  const botResolvedPct =
    stats && stats.closedConversations > 0
      ? Math.round((stats.closedByBot / stats.closedConversations) * 100)
      : 0;

  if (memberships === undefined || (memberships.length === 1 && !tenantId)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500">Cargando…</p>
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
    <div
      className="min-h-full overflow-y-auto bg-[#f8fafc]"
      style={
        {
          "--primaryColor": primaryColor,
          "--secondaryColor": secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
             
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {greeting}, {firstName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
                    ycloudConnected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      ycloudConnected ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                  {ycloudConnected ? "WhatsApp conectado" : "Conecta WhatsApp"}
                </span>
              
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRangeDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 transition hover:bg-slate-50"
                >
                  {RANGE_OPTIONS.find((r) => r.value === rangeDays)?.label ?? "7 días"}
                  <ChevronDown className="size-4 text-slate-400" />
                </button>
                {rangeDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setRangeDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-1.5 min-w-[120px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-900/5">
                      {RANGE_OPTIONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => {
                            setRangeDays(r.value);
                            setRangeDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full px-3.5 py-2 text-left text-sm",
                            rangeDays === r.value
                              ? "bg-slate-50 font-medium text-slate-900"
                              : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Link
                href="/tenants/inbox"
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
                style={{ backgroundColor: primaryColor }}
              >
                <Mail className="size-4" strokeWidth={2} />
                Ir al Inbox
              </Link>
            </div>
          </div>
        </header>

        {/* KPI Cards - 4 principales */}
        <section className="mb-10">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              title="Conversaciones"
              value={stats?.totalConversations ?? 0}
              changePct={stats?.changePct}
              sparkline={stats?.sparkline}
              icon={MessageSquare}
              primaryColor={primaryColor}
            />
            <KPICard
              title="Activas ahora"
              value={stats?.openConversations ?? 0}
              icon={MessageCircle}
              primaryColor={primaryColor}
            />
            <KPICard
              title="Cerradas"
              value={stats?.closedConversations ?? 0}
              icon={TrendingUp}
              primaryColor={primaryColor}
            />
            <KPICard
              title="Resueltas por Bot"
              value={`${botResolvedPct}%`}
              icon={Bot}
              primaryColor={primaryColor}
            />
          </div>
        </section>

        {!ycloudConnected && (
          <section className="mb-10">
            <IntegrationBanner primaryColor={primaryColor} />
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main: Gráfico + Bot */}
          <div className="lg:col-span-2 space-y-8">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">
                    Conversaciones por día
                  </h2>
                  <span className="text-xs font-medium text-slate-400">
                    Pico a las {String(stats?.peakHour ?? 12).padStart(2, "0")}:00
                  </span>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="h-36">
                  {stats?.sparkline && stats.sparkline.length > 0 ? (
                    <SparklineChart
                      data={stats.sparkline}
                      primaryColor={primaryColor}
                      secondaryColor={secondaryColor}
                      height={140}
                      showArea={true}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg bg-slate-50/80 text-sm text-slate-400">
                      Sin datos en este periodo
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Rendimiento del Bot
                </h2>
              </div>
              <div className="grid gap-0 sm:grid-cols-2">
                <div
                  className="border-b border-slate-100 p-6 sm:border-b-0 sm:border-r"
                  style={{ backgroundColor: `${primaryColor}06` }}
                >
                  <p className="text-sm font-medium text-slate-600">
                    Resueltas sin humano
                  </p>
                  <p
                    className="mt-2 text-3xl font-semibold tabular-nums"
                    style={{ color: primaryColor }}
                  >
                    {botResolvedPct}%
                  </p>
                </div>
                <div className="p-6">
                  <p className="text-sm font-medium text-slate-600">
                    Escaladas a humano
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
                    {stats?.humanConversations ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Integraciones
                </h2>
              </div>
              <div className="p-6">
                <IntegrationsStatus
                  ycloudConnected={ycloudConnected}
                  primaryColor={primaryColor}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Actividad
                </h2>
              </div>
              <div className="p-4">
                <ActivityTimeline
                  activities={activities}
                  primaryColor={primaryColor}
                  maxItems={5}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
