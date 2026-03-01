"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  PieChart,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIRow {
  title: string;
  value: string | number;
  changePct?: number;
  sparkline?: number[];
  icon: React.ElementType;
  colorClass: string;
}

interface ControlKPIsProps {
  metrics: {
    occupiedNow: number;
    available: number;
    totalReservations: number;
    noShowsToday: number;
    occupancyPct: number;
    avgDurationMinutes: number;
    changePct?: number;
  };
  primaryColor: string;
}

export function ControlKPIs({ metrics, primaryColor }: ControlKPIsProps) {
  const kpis: KPIRow[] = [
    {
      title: "Mesas ocupadas",
      value: metrics.occupiedNow,
      icon: Table2,
      colorClass: "text-emerald-700 bg-emerald-100",
    },
    {
      title: "Mesas disponibles",
      value: metrics.available,
      icon: CheckCircle2,
      colorClass: "text-blue-700 bg-blue-100",
    },
    {
      title: "Reservas hoy",
      value: metrics.totalReservations,
      changePct: metrics.changePct,
      icon: Users,
      colorClass: "text-cyan-700 bg-cyan-100",
    },
    {
      title: "No shows hoy",
      value: metrics.noShowsToday,
      icon: AlertCircle,
      colorClass: metrics.noShowsToday > 0 ? "text-rose-700 bg-rose-100" : "text-slate-500 bg-slate-100",
    },
    {
      title: "% Ocupación",
      value: `${metrics.occupancyPct}%`,
      icon: PieChart,
      colorClass: "text-amber-700 bg-amber-100",
    },
    {
      title: "Tiempo promedio",
      value: `${metrics.avgDurationMinutes} min`,
      icon: Clock,
      colorClass: "text-violet-700 bg-violet-100",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {kpi.title}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {kpi.value}
                </p>
                {kpi.changePct != null && kpi.changePct !== 0 && (
                  <span
                    className={cn(
                      "mt-1 inline-flex text-xs font-medium",
                      kpi.changePct > 0 ? "text-emerald-600" : "text-rose-600"
                    )}
                  >
                    {kpi.changePct > 0 ? "+" : ""}
                    {kpi.changePct}% vs ayer
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl",
                  kpi.colorClass
                )}
              >
                <Icon className="size-6" strokeWidth={1.8} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
