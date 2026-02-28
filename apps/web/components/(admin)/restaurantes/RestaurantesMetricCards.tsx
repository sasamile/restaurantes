"use client";

import { Building2, Clock, CheckCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MetricCardConfig {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

interface RestaurantesMetricCardsProps {
  stats: {
    total: number;
    active: number;
    trial: number;
    cancelled: number;
  };
}

const CARD_CONFIG = (
  stats: RestaurantesMetricCardsProps["stats"]
): MetricCardConfig[] => [
  {
    label: "Total",
    value: stats.total,
    icon: Building2,
    iconBg: "#EEF2FF",
    iconColor: "#6366F1",
  },
  {
    label: "Activos",
    value: stats.active,
    icon: CheckCircle,
    iconBg: "#ECFDF5",
    iconColor: "#10B981",
  },
  {
    label: "Prueba",
    value: stats.trial,
    icon: Clock,
    iconBg: "#FFFBEB",
    iconColor: "#F59E0B",
  },
  {
    label: "Cancelados",
    value: stats.cancelled,
    icon: XCircle,
    iconBg: "#FEF2F2",
    iconColor: "#EF4444",
  },
];

export function RestaurantesMetricCards({ stats }: RestaurantesMetricCardsProps) {
  const cards = CARD_CONFIG(stats);
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
        <div
          key={label}
          className="flex items-center gap-4 rounded-[20px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="h-6 w-6" style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-[14px] font-medium text-[#64748B]">{label}</p>
            <p className="text-[28px] font-bold leading-tight text-[#0F172A]">
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
