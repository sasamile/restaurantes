"use client";


import { STATUS_LABELS } from "@/constants";
import type { TenantStatus } from "@/types/types";

type TenantForGeneral = {
  name: string;
  slug?: string;
  planName: string | null;
  status: TenantStatus;
  address?: string | null;
  phone?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export function GeneralTab({
  tenant,
  onEdit,
}: {
  tenant: TenantForGeneral;
  onEdit: () => void;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Información general */}
      <div className="relative rounded-[16px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow duration-150 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-base font-semibold text-[#0F172A]">
          Información general
        </h3>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[#64748B]">Nombre</dt>
            <dd className="font-medium text-[#334155]">{tenant.name}</dd>
          </div>
          {tenant.address && (
            <div>
              <dt className="text-[#64748B]">Dirección</dt>
              <dd className="font-medium text-[#334155]">{tenant.address}</dd>
            </div>
          )}
          {tenant.phone && (
            <div>
              <dt className="text-[#64748B]">Teléfono</dt>
              <dd className="font-medium text-[#334155]">{tenant.phone}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Configuración visual */}
      <div className="relative rounded-[16px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow duration-150 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-base font-semibold text-[#0F172A]">
          Configuración visual
        </h3>
        <p className="mb-3 text-sm text-[#64748B]">Colores primarios</p>
        <div className="flex gap-3">
          {tenant.primaryColor && (
            <div className="flex items-center gap-2">
              <span
                className="h-10 w-10 rounded-full border border-[#E2E8F0]"
                style={{ backgroundColor: tenant.primaryColor }}
              />
              <span className="text-sm text-[#64748B]">Primario</span>
            </div>
          )}
          {tenant.secondaryColor && (
            <div className="flex items-center gap-2">
              <span
                className="h-10 w-10 rounded-full border border-[#E2E8F0]"
                style={{ backgroundColor: tenant.secondaryColor }}
              />
              <span className="text-sm text-[#64748B]">Secundario</span>
            </div>
          )}
          {!tenant.primaryColor && !tenant.secondaryColor && (
            <p className="text-sm text-[#64748B]">Sin colores configurados</p>
          )}
        </div>
      </div>

      {/* Configuración del plan */}
      <div className="relative rounded-[16px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow duration-150 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] sm:col-span-2">
        <h3 className="mb-4 text-base font-semibold text-[#0F172A]">
          Configuración del plan
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#64748B]">Plan</dt>
            <dd className="font-medium text-[#334155]">
              {tenant.planName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[#64748B]">Estado</dt>
            <dd className="font-medium text-[#334155]">
              {STATUS_LABELS[tenant.status]}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
