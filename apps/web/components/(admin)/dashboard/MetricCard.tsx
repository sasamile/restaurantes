"use client";

import { LucideIcon } from "lucide-react";
import { formatPrice } from "@/lib/format-price";

type MetricCardProps = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string | number;
  label: string;
  sub?: string;
  variation?: { value: number; positive: boolean };
  formatAsPrice?: boolean;
};

export function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  sub,
  variation,
  formatAsPrice,
}: MetricCardProps) {
  const displayValue =
    formatAsPrice && typeof value === "number" ? formatPrice(value) : String(value);

  return (
    <div className="group rounded-[20px] border border-[#E2E8F0] bg-white p-7 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-180 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {variation && (
          <span
            className="text-xs font-medium"
            style={{
              color: variation.positive ? "#10B981" : "#EF4444",
            }}
          >
            {variation.positive ? "+" : ""}
            {variation.value}%
          </span>
        )}
      </div>
      <p className="mt-4 text-[36px] font-bold text-[#0F172A] leading-none">
        {formatAsPrice ? `$${displayValue}` : displayValue}
      </p>
      <p className="mt-2 text-sm text-[#64748B]">{label}</p>
      {sub && <p className="mt-1 text-xs text-[#94A3B8]">{sub}</p>}
    </div>
  );
}
