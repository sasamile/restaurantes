"use client";

import { formatPrice } from "@/lib/format-price";

type Stats = {
  totalPlanes: number;
  valorEstimadoMensual: number;
} | undefined;

export function PlansMetrics({ stats }: { stats: Stats }) {
  if (stats === undefined) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <p className="text-sm font-medium text-[#64748B]">Planes activos</p>
        <p className="mt-1 text-2xl font-bold text-[#0F172A]">{stats.totalPlanes}</p>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <p className="text-sm font-medium text-[#64748B]">Ingresos estimados/mes</p>
        <p className="mt-1 text-2xl font-bold text-[#0F172A]">
          ${formatPrice(stats.valorEstimadoMensual ?? 0)}
        </p>
      </div>
    </div>
  );
}
