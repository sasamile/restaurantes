"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex";
import { useTenant } from "@/lib/tenant-context";
import type { Role } from "../../../lib/types";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  AGENT: "Agente",
  VIEWER: "Solo lectura",
};

export default function UsersPage() {
  const { tenantId } = useTenant();

  const tenant = useQuery(
    api.tenants.get,
    tenantId ? { tenantId } : "skip"
  );
  const members = useQuery(
    api.users.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const memberships = members ?? [];

  if (!tenantId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Usuarios & roles — {tenant?.name ?? "Restaurante"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Controla qué usuarios pueden acceder a este restaurante y qué pueden
            hacer dentro del panel.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          + Invitar usuario
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr),minmax(0,3fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm text-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Usuarios con acceso
          </div>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Usuario
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Rol
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {memberships.map((m) => (
                <tr key={m._id}>
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">
                        {m.user?.name ?? "—"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {m.user?.email ?? ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                      {ROLE_LABELS[m.role as Role] ?? m.role}
                      {m.role === "OWNER" && (
                        <span className="text-[9px] uppercase tracking-wide text-emerald-600">
                          (propietario)
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Cambiar rol
                    </button>
                  </td>
                </tr>
              ))}
              {memberships.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-xs text-slate-500"
                  >
                    Aún no hay usuarios asignados a este restaurante.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Modelo de permisos SaaS
          </h2>
          <p className="mt-2 text-xs text-slate-600">
            A nivel de backend tendrás:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
            <li>
              Tabla <code className="text-[11px] rounded bg-slate-100 px-1">users</code> con{" "}
              <code className="text-[11px] rounded bg-slate-100 px-1">is_superadmin</code>.
            </li>
            <li>
              Tabla <code className="text-[11px] rounded bg-slate-100 px-1">tenants</code> para
              restaurantes.
            </li>
            <li>
              Tabla <code className="text-[11px] rounded bg-slate-100 px-1">user_tenants</code> con{" "}
              <code className="text-[11px] rounded bg-slate-100 px-1">role</code> por tenant.
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            Cada request al backend incluirá el{" "}
            <code className="text-[11px] rounded bg-slate-100 px-1">tenant_id</code> y el usuario
            autenticado.
          </p>
        </div>
      </div>
    </div>
  );
}
