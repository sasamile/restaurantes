"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type FilterTab =
  | "todas"
  | "hoy"
  | "confirmadas"
  | "pendientes"
  | "no_show"
  | "canceladas";

interface ReservasTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: {
    todas: number;
    hoy: number;
    confirmadas: number;
    pendientes: number;
    no_show: number;
    canceladas: number;
  };
  primaryColor: string;
}

const TABS: { key: FilterTab; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "hoy", label: "Hoy" },
  { key: "confirmadas", label: "Confirmadas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "no_show", label: "No se presentaron" },
  { key: "canceladas", label: "Canceladas" },
];

export function ReservasTabs({
  activeTab,
  onTabChange,
  counts,
  primaryColor,
}: ReservasTabsProps) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      {TABS.map(({ key, label }) => {
        const count = counts[key];
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
