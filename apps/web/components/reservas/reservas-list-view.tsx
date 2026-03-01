"use client";

import * as React from "react";
import { MoreHorizontal, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex";

type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed" | "no_show";

interface Reservation {
  _id: Id<"reservations">;
  customerName: string;
  customerPhone?: string;
  startTime: number;
  endTime: number;
  tableNumber?: string;
  status: ReservationStatus;
  source?: string;
  extraData?: string;
}

interface ReservasListViewProps {
  reservations: Reservation[];
  onReservationClick: (r: Reservation) => void;
  primaryColor: string;
}

function parsePartySize(extraData?: string): number | null {
  if (!extraData) return null;
  try {
    const d = JSON.parse(extraData) as { partySize?: number; people?: number };
    return d.partySize ?? d.people ?? null;
  } catch {
    return null;
  }
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No se presentó",
};

export function ReservasListView({
  reservations,
  onReservationClick,
}: ReservasListViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hora
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mesa
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Personas
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Estado
              </th>
              <th className="w-12 px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                  No hay reservas en este rango
                </td>
              </tr>
            ) : (
              reservations.map((r) => {
                const partySize = parsePartySize(r.extraData);
                return (
                  <tr
                    key={r._id}
                    className="cursor-pointer transition hover:bg-slate-50/80"
                    onClick={() => onReservationClick(r)}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                      {new Date(r.startTime).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{r.customerName}</span>
                        {r.customerPhone && (
                          <a
                            href={`tel:${r.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            title="Llamar"
                          >
                            <Phone className="size-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {r.tableNumber ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {partySize ?? "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                          r.status === "confirmed" && "bg-emerald-100 text-emerald-800",
                          r.status === "pending" && "bg-amber-100 text-amber-800",
                          r.status === "cancelled" && "bg-slate-100 text-slate-600",
                          r.status === "no_show" && "bg-rose-100 text-rose-800",
                          r.status === "completed" && "bg-slate-100 text-slate-600"
                        )}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReservationClick(r);
                        }}
                        className="rounded p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
