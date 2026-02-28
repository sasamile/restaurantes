"use client";

import { Building2, DollarSign, Users, MessageCircle } from "lucide-react";
import { MetricCard } from "./MetricCard";

type Stats = {
  totalRestaurantes: number;
  restaurantesActivos: number;
  restaurantesTrial: number;
  totalUsuarios: number;
  totalConversaciones: number;
  valorEstimadoMensual: number;
} | undefined;

export function DashboardMetricCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        icon={Building2}
        iconBg="#EEF2FF"
        iconColor="#6366F1"
        value={stats?.totalRestaurantes ?? "—"}
        label="Restaurantes"
        sub={stats ? `${stats.restaurantesActivos} activos · ${stats.restaurantesTrial} trial` : undefined}
      />
      <MetricCard
        icon={DollarSign}
        iconBg="#FEF2F2"
        iconColor="#EF4444"
        value={stats?.valorEstimadoMensual ?? 0}
        label="MRR estimado"
        formatAsPrice
      />
      <MetricCard
        icon={Users}
        iconBg="#ECFDF5"
        iconColor="#10B981"
        value={stats?.totalUsuarios ?? "—"}
        label="Usuarios"
      />
      <MetricCard
        icon={MessageCircle}
        iconBg="#EFF6FF"
        iconColor="#3B82F6"
        value={stats?.totalConversaciones ?? "—"}
        label="Conversaciones"
      />
    </div>
  );
}
