"use client";

import { Search } from "lucide-react";
import type { TenantStatus } from "@/types/types";

interface Plan {
  _id: string;
  name: string;
}

interface RestaurantesTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterStatus: TenantStatus | "";
  onStatusChange: (value: TenantStatus | "") => void;
  filterPlanId: string;
  onPlanChange: (value: string) => void;
  plans: Plan[] | undefined;
  count: number;
}

export function RestaurantesTableToolbar({
  searchQuery,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterPlanId,
  onPlanChange,
  plans,
  count,
}: RestaurantesTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
        <input
          type="text"
          placeholder="Buscar restaurantes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] transition-shadow focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
        />
      </div>
      <select
        value={filterStatus}
        onChange={(e) => onStatusChange((e.target.value || "") as TenantStatus | "")}
        className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 pr-8 text-[14px] text-[#0F172A] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
      >
        <option value="">Todos los estados</option>
        <option value="active">Activo</option>
        <option value="trial">Prueba</option>
        <option value="cancelled">Cancelado</option>
      </select>
      <select
        value={filterPlanId}
        onChange={(e) => onPlanChange(e.target.value)}
        className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 pr-8 text-[14px] text-[#0F172A] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
      >
        <option value="">Todos los planes</option>
        {plans?.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>
      <p className="text-[14px] font-medium text-[#64748B]">
        {count} {count === 1 ? "restaurante" : "restaurantes"}
      </p>
    </div>
  );
}
