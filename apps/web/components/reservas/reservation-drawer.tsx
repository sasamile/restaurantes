"use client";

import * as React from "react";
import {
  X,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  User,
  Calendar,
  MapPin,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex";

type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed" | "no_show";

interface Reservation {
  _id: Id<"reservations">;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  startTime: number;
  endTime: number;
  tableNumber?: string;
  status: ReservationStatus;
  source?: string;
  extraData?: string;
}

interface ReservationDrawerProps {
  reservation: Reservation | null;
  onClose: () => void;
  primaryColor: string;
  onConfirm: (id: Id<"reservations">) => void;
  onCancel: (id: Id<"reservations">) => void;
  onMarkNoShow: (id: Id<"reservations">) => void;
  onFreeTable: (id: Id<"reservations">) => void;
  onEdit?: (id: Id<"reservations">) => void;
  onDelete?: (id: Id<"reservations">) => void;
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

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSource(source?: string) {
  if (source === "virtual") return "WhatsApp";
  if (source === "presencial") return "Manual / Web";
  return source ?? "-";
}

export function ReservationDrawer({
  reservation,
  onClose,
  primaryColor,
  onConfirm,
  onCancel,
  onMarkNoShow,
  onFreeTable,
  onEdit,
  onDelete,
}: ReservationDrawerProps) {
  if (!reservation) return null;

  const partySize = parsePartySize(reservation.extraData);
  const canConfirm = reservation.status === "pending" || !reservation.status;
  const canCancel = reservation.status !== "cancelled" && reservation.status !== "no_show";
  const canMarkNoShow = reservation.status !== "cancelled" && reservation.status !== "no_show";
  const canFreeTable = reservation.status === "confirmed";

  const statusLabel =
    reservation.status === "confirmed"
      ? "Confirmada"
      : reservation.status === "pending"
        ? "Pendiente"
        : reservation.status === "cancelled"
          ? "Cancelada"
          : reservation.status === "no_show"
            ? "No se presentó"
            : reservation.status === "completed"
              ? "Completada"
              : "Confirmada";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform"
        role="dialog"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="drawer-title" className="text-lg font-semibold text-slate-900">
            Detalle de reserva
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-5">
            <div>
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                  reservation.status === "confirmed" && "bg-emerald-100 text-emerald-800",
                  reservation.status === "pending" && "bg-amber-100 text-amber-800",
                  reservation.status === "cancelled" && "bg-slate-100 text-slate-600",
                  reservation.status === "no_show" && "bg-rose-100 text-rose-800",
                  reservation.status === "completed" && "bg-slate-100 text-slate-600"
                )}
              >
                {statusLabel}
              </span>
            </div>

            <div>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <User className="size-4 text-slate-500" />
                {reservation.customerName}
              </p>
              {reservation.customerPhone && (
                <a
                  href={`tel:${reservation.customerPhone}`}
                  className="mt-2 flex items-center gap-2 text-sm text-slate-700 hover:underline"
                >
                  <Phone className="size-4 text-slate-500" />
                  {reservation.customerPhone}
                </a>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar className="size-4 text-slate-500" />
                {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
              </p>
              {reservation.tableNumber && (
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="size-4 text-slate-500" />
                  Mesa {reservation.tableNumber}
                </p>
              )}
              {partySize != null && (
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <Users className="size-4 text-slate-500" />
                  {partySize} personas
                </p>
              )}
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <FileText className="size-4" />
                Origen: {formatSource(reservation.source)}
              </p>
            </div>

            {/* Acciones rápidas */}
            <div className="space-y-2 border-t border-slate-200 pt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Acciones rápidas
              </p>
              <div className="flex flex-wrap gap-2">
                {canConfirm && (
                  <button
                    type="button"
                    onClick={() => onConfirm(reservation._id)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200"
                  >
                    <CheckCircle2 className="size-4" /> Confirmar
                  </button>
                )}
                {canFreeTable && (
                  <button
                    type="button"
                    onClick={() => onFreeTable(reservation._id)}
                    className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 transition hover:bg-blue-200"
                  >
                    <RefreshCw className="size-4" /> Liberar mesa
                  </button>
                )}
                {canMarkNoShow && (
                  <button
                    type="button"
                    onClick={() => onMarkNoShow(reservation._id)}
                    className="flex items-center gap-2 rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-200"
                  >
                    <AlertCircle className="size-4" /> No se presentó
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => onCancel(reservation._id)}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    <XCircle className="size-4" /> Cancelar
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(reservation._id)}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Edit className="size-4" /> Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(reservation._id)}
                    className="flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                  >
                    <Trash2 className="size-4" /> Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
