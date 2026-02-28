"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { TenantWithPlan } from "@/hook/use-restaurantes-page";
import { STATUS_BADGE_STYLES, STATUS_LABELS } from "@/types/types";

interface RestaurantesTableProps {
  tenants: TenantWithPlan[];
  onEdit: (tenant: TenantWithPlan) => void;
  onDeleteClick: (tenantId: TenantWithPlan["_id"]) => void;
  hasActiveFilters: boolean;
}

const TABLE_HEADERS = [
  { key: "restaurante", label: "Restaurante", align: "left" as const },
  { key: "plan", label: "Plan", align: "left" as const },
  { key: "estado", label: "Estado", align: "left" as const },
  { key: "colores", label: "Colores", align: "left" as const },
  { key: "acciones", label: "Acciones", align: "right" as const },
];

function TableRow({
  tenant,
  onEdit,
  onDeleteClick,
  onRowClick,
}: {
  tenant: TenantWithPlan;
  onEdit: (t: TenantWithPlan) => void;
  onDeleteClick: (id: TenantWithPlan["_id"]) => void;
  onRowClick: (id: TenantWithPlan["_id"]) => void;
}) {
  return (
    <tr
      className="h-16 cursor-pointer border-b border-[#E2E8F0] transition-colors duration-150 hover:bg-[#F1F5F9] last:border-0"
      onClick={() => onRowClick(tenant._id)}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {tenant.primaryColor && (
            <span
              className="h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: tenant.primaryColor }}
            />
          )}
          <span className="text-sm font-semibold text-[#0F172A] uppercase">
            {tenant.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="inline-flex rounded-full bg-[#EEF2FF] px-3 py-1 text-[13px] font-medium text-[#4338CA]">
          {tenant.planName ?? "—"}
        </span>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex animate-in fade-in rounded-full px-3 py-1 text-[13px] font-medium ${STATUS_BADGE_STYLES[tenant.status]}`}
        >
          {STATUS_LABELS[tenant.status]}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {tenant.primaryColor && (
            <span
              className="h-6 w-6 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              style={{ backgroundColor: tenant.primaryColor }}
              title={tenant.primaryColor}
            />
          )}
          {tenant.secondaryColor && (
            <span
              className="h-6 w-6 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              style={{ backgroundColor: tenant.secondaryColor }}
              title={tenant.secondaryColor}
            />
          )}
          {!tenant.primaryColor && !tenant.secondaryColor && (
            <span className="text-[14px] text-[#94A3B8]">—</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onEdit(tenant)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition-all duration-150 hover:scale-[0.98] hover:bg-[#E2E8F0] active:scale-[0.98]"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteClick(tenant._id)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] transition-all duration-150 hover:scale-[0.98] hover:bg-[#FEE2E2] hover:text-[#EF4444] active:scale-[0.98]"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function MobileCard({
  tenant,
  onEdit,
  onDeleteClick,
  onRowClick,
}: {
  tenant: TenantWithPlan;
  onEdit: (t: TenantWithPlan) => void;
  onDeleteClick: (id: TenantWithPlan["_id"]) => void;
  onRowClick: (id: TenantWithPlan["_id"]) => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 border-b border-[#E2E8F0] p-4 last:border-0 active:bg-[#F1F5F9]"
      onClick={() => onRowClick(tenant._id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick(tenant._id);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tenant.primaryColor && (
            <span
              className="h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
              style={{ backgroundColor: tenant.primaryColor }}
            />
          )}
          <span className="text-[16px] font-medium text-[#0F172A]">
            {tenant.name}
          </span>
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onEdit(tenant)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteClick(tenant._id)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B]"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full bg-[#EEF2FF] px-3 py-1 text-[13px] font-medium text-[#4338CA]">
          {tenant.planName ?? "—"}
        </span>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[13px] font-medium ${STATUS_BADGE_STYLES[tenant.status]}`}
        >
          {STATUS_LABELS[tenant.status]}
        </span>
      </div>
      {(tenant.primaryColor || tenant.secondaryColor) && (
        <div className="flex gap-2">
          {tenant.primaryColor && (
            <span
              className="h-6 w-6 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              style={{ backgroundColor: tenant.primaryColor }}
            />
          )}
          {tenant.secondaryColor && (
            <span
              className="h-6 w-6 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              style={{ backgroundColor: tenant.secondaryColor }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function RestaurantesTable({
  tenants,
  onEdit,
  onDeleteClick,
  hasActiveFilters,
}: RestaurantesTableProps) {
  const router = useRouter();
  const onRowClick = (id: TenantWithPlan["_id"]) =>
    router.push(`/superadmin/restaurantes/${id}`);

  return (
    <>
      <div className="hidden lg:block">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              {TABLE_HEADERS.map(({ key, label, align }) => (
                <th
                  key={key}
                  className={`px-6 py-4 text-[12px] font-medium uppercase tracking-wider text-[#64748B] ${
                    align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <TableRow
                key={tenant._id}
                tenant={tenant}
                onEdit={onEdit}
                onDeleteClick={onDeleteClick}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="lg:hidden">
        {tenants.map((tenant) => (
          <MobileCard
            key={tenant._id}
            tenant={tenant}
            onEdit={onEdit}
            onDeleteClick={onDeleteClick}
            onRowClick={onRowClick}
          />
        ))}
      </div>
      {tenants.length === 0 && (
        <div className="py-12 text-center text-[14px] text-[#64748B]">
          {hasActiveFilters
            ? "No hay resultados para los filtros aplicados."
            : "No hay restaurantes."}
        </div>
      )}
    </>
  );
}
