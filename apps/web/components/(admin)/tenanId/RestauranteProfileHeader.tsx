"use client";

import { MapPin, Phone, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS } from "@/constants";
import type { TenantStatus } from "@/types/types";

type TenantForHeader = {
  name: string;
  logoUrl?: string | null;
  planName: string | null;
  status: TenantStatus;
  address?: string | null;
  phone?: string | null;
};

export function RestauranteProfileHeader({
  tenant,
  onEdit,
}: {
  tenant: TenantForHeader;
  onEdit: () => void;
}) {
  const isPro = (tenant.planName ?? "").toLowerCase().includes("pro");
  const statusLabel = STATUS_LABELS[tenant.status];

  return (
    <section
      className="rounded-[24px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow duration-150 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] sm:p-8"
      style={{ borderRadius: "24px" }}
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[auto_1fr_auto] md:items-start">
        <div className="flex flex-col items-center gap-3 md:items-start">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F1F5F9] shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
            style={{ minHeight: 96, minWidth: 96 }}
          >
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-[#94A3B8]">
                {tenant.name.charAt(0)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
          >
            Cambiar logo
          </button>
        </div>

        <div className="min-w-0 space-y-3">
          <h1 className="text-2xl font-semibold text-[#0F172A] sm:text-[28px]">
            {tenant.name}
          </h1>
          <div className="flex flex-wrap gap-2">
            {isPro && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}
              >
                Plan PRO
              </span>
            )}
            {!isPro && tenant.planName && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}
              >
                {tenant.planName}
              </span>
            )}
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor:
                  tenant.status === "trial" ? "#FEF3C7" : "#DCFCE7",
                color: tenant.status === "trial" ? "#92400E" : "#166534",
              }}
            >
              Estado {statusLabel}
            </span>
          </div>
          <div className="space-y-2 pt-2">
            {tenant.address && (
              <div className="flex items-center gap-2 text-sm text-[#334155]">
                <MapPin className="h-4 w-4 shrink-0 text-[#64748B]" />
                <span>{tenant.address}</span>
              </div>
            )}
            {tenant.phone && (
              <div className="flex items-center gap-2 text-sm text-[#334155]">
                <Phone className="h-4 w-4 shrink-0 text-[#64748B]" />
                <span>{tenant.phone}</span>
              </div>
            )}
            {(tenant as { email?: string }).email && (
              <div className="flex items-center gap-2 text-sm text-[#334155]">
                <Mail className="h-4 w-4 shrink-0 text-[#64748B]" />
                <span>{(tenant as { email?: string }).email}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="h-10 rounded-xl border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#0F172A] transition-all duration-150 hover:bg-[#F1F5F9] active:scale-[0.98]"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar información
          </Button>
        </div>
      </div>
    </section>
  );
}
