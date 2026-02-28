"use client";

import { Check } from "lucide-react";
import { formatPrice } from "@/lib/format-price";
import type { Id } from "@/convex";

type Plan = {
  _id: Id<"plans">;
  name: string;
  price: number;
  priceAnnual?: number;
};

export function PlanCard({
  plan,
  billingPeriod,
  isPopular,
  onEdit,
  onDelete,
}: {
  plan: Plan;
  billingPeriod: "monthly" | "annual";
  isPopular?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const features = ["Soporte", "Acceso IA"];

  return (
    <div
      className="group relative flex flex-col rounded-[24px] border border-[#E2E8F0] bg-white p-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-180 ease-out hover:-translate-y-1 hover:shadow-md"
      style={isPopular ? { borderTop: "3px solid #EF4444", borderColor: "#EF4444" } : undefined}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#EF4444] px-3 py-0.5 text-xs font-medium text-white">
          Más popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#0F172A]">{plan.name}</h3>
        {plan.name.toLowerCase().includes("pro") && !isPopular && (
          <span className="mt-1 inline-block text-xs font-medium text-[#64748B]">Recomendado</span>
        )}
      </div>

      <div className="mb-6 flex items-baseline gap-0.5">
        <span className="text-[40px] font-bold text-[#0F172A]">
          ${formatPrice(
            billingPeriod === "annual"
              ? plan.priceAnnual ?? plan.price * 12
              : plan.price
          )}
        </span>
        <span className="text-sm text-[#64748B]">
          {billingPeriod === "annual" ? "/año" : "/mes"}
        </span>
      </div>

      <div className="mb-6 h-px bg-[#F1F5F9]" aria-hidden />

      <ul className="mb-8 space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-[#334155]">
            <Check className="h-4 w-4 shrink-0 text-[#10B981]" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-xl border border-[#E2E8F0] py-3 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
        >
          Editar plan
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl px-4 py-3 text-sm font-medium text-[#EF4444] transition-colors hover:bg-[#FEF2F2] sm:shrink-0"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
