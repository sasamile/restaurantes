"use client";

import { cn } from "@/lib/utils";

type BillingPeriod = "monthly" | "annual";

export function BillingToggle({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          value === "monthly"
            ? "bg-[#0F172A] text-white"
            : "text-[#64748B] hover:text-[#0F172A]"
        )}
      >
        Mensual
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          value === "annual"
            ? "bg-[#0F172A] text-white"
            : "text-[#64748B] hover:text-[#0F172A]"
        )}
      >
        Anual
      </button>
    </div>
  );
}
