"use client";

import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import type { Id } from "@/convex";

type TenantWithPlan = {
  _id: Id<"tenants">;
  name: string;
  planId?: Id<"plans"> | null;
  planName: string | null;
};

type Plan = { _id: Id<"plans">; name: string };

export function AssignmentSection({
  tenants,
  plans,
  onPlanChange,
}: {
  tenants: TenantWithPlan[] | undefined;
  plans: Plan[] | undefined;
  onPlanChange: (tenantId: Id<"tenants">, planId: Id<"plans"> | undefined) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white p-7 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B]">
          <Building2 className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-[#0F172A]">
            Asignación de planes por restaurante
          </h3>
          <p className="mt-2 text-sm text-[#64748B]">
            En el detalle de cada restaurante podrás asignar o cambiar su plan.
            También puedes hacerlo directamente en la tabla de abajo.
          </p>
        </div>
      </div>

      {tenants !== undefined && tenants.length > 0 && plans !== undefined && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="px-4 py-3 text-left font-medium text-[#64748B]">
                  Restaurante
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#64748B]">
                  Plan actual
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#64748B]">
                  Cambiar plan
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr
                  key={t._id}
                  className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]"
                >
                  <td className="px-4 py-3 font-medium text-[#0F172A]">
                    {t.name}
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">
                    {t.planName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.planId ?? ""}
                      onChange={(e) =>
                        onPlanChange(
                          t._id,
                          e.target.value ? (e.target.value as Id<"plans">) : undefined
                        )
                      }
                      className="w-full max-w-[180px] rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
                    >
                      <option value="">Sin plan</option>
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
