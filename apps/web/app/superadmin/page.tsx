"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex";

export default function SuperadminDashboardPage() {
  const stats = useQuery(api.superadmin.getStats);

  const cards = [
    {
      href: "/superadmin/restaurantes",
      title: "Restaurantes",
      desc: "Crear restaurantes, colores, plan, prompt. Administradores por restaurante.",
      count: stats === undefined ? "—" : String(stats.totalRestaurantes),
      sub: stats ? `${stats.restaurantesActivos} activos · ${stats.restaurantesTrial} trial` : null,
    },
    {
      href: "/superadmin/planes",
      title: "Planes",
      desc: "Configurar planes disponibles para los restaurantes.",
      count: stats === undefined ? "—" : String(stats.totalPlanes),
      sub: null,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800">
        Dashboard Superadmin
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Vista general del SaaS de restaurantes.
      </p>

      {/* Analytics */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Restaurantes</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">
            {stats === undefined ? "—" : stats.totalRestaurantes}
          </p>
          {stats && (
            <p className="mt-1 text-xs text-slate-500">
              {stats.restaurantesActivos} activos · {stats.restaurantesTrial} trial
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Valor estimado/mes</p>
          <p className="mt-1 text-3xl font-bold text-red-600">
            {stats === undefined ? "—" : `$${stats.valorEstimadoMensual}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Suma de planes activos
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Usuarios</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">
            {stats === undefined ? "—" : stats.totalUsuarios}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Conversaciones</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">
            {stats === undefined ? "—" : stats.totalConversaciones}
          </p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <h3 className="mt-10 text-lg font-semibold text-slate-800">Accesos rápidos</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-red-200 hover:shadow-md hover:shadow-red-50"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 group-hover:text-red-600">
                {card.title}
              </h4>
              <span className="text-2xl font-bold text-slate-200 group-hover:text-red-200">
                {card.count}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{card.desc}</p>
            {card.sub && (
              <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
