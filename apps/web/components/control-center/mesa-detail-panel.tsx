"use client";

import * as React from "react";
import {
  CheckCircle2,
  X,
  RefreshCw,
  Clock,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MesaDetailPanelProps {
  mesa: {
    name: string;
    status: string;
    currentReservation?: {
      _id: string;
      customerName: string;
      customerPhone?: string;
      tableNumber?: string;
      startTime: number;
      endTime: number;
      confirmedAt?: number;
    };
    nextReservation?: {
      _id: string;
      customerName: string;
      startTime: number;
      endTime: number;
    };
  } | null;
  onClose: () => void;
  onConfirmArrival: (reservationId: string) => void;
  onMarkNoShow: (reservationId: string) => void;
  onFreeTable: (reservationId: string) => void;
  primaryColor: string;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minsRemaining(ts: number) {
  const diff = (ts - Date.now()) / 60000;
  if (diff <= 0) return "Finalizado";
  return `${Math.round(diff)} min`;
}

export function MesaDetailPanel({
  mesa,
  onClose,
  onConfirmArrival,
  onMarkNoShow,
  onFreeTable,
  primaryColor,
}: MesaDetailPanelProps) {
  if (!mesa) return null;

  const { currentReservation, nextReservation, status, name } = mesa;

  return (
    <div className="flex w-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 sm:w-80">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Mesa {name}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="size-5" />
        </button>
      </div>
      <span
        className={cn(
          "mt-2 inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium",
          status === "occupied" && "bg-amber-100 text-amber-800",
          status === "reserved" && "bg-blue-100 text-blue-800",
          status === "available" && "bg-emerald-100 text-emerald-800",
          status === "no_show" && "bg-rose-100 text-rose-800"
        )}
      >
        {status === "occupied" ? "Ocupada" : status === "reserved" ? "Reservada" : status === "no_show" ? "No show" : "Disponible"}
      </span>

      {currentReservation && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Reserva actual
          </p>
          <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
            <User className="size-4 text-slate-500" />
            {currentReservation.customerName}
          </p>
          {currentReservation.customerPhone && (
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <Phone className="size-4" />
              {currentReservation.customerPhone}
            </p>
          )}
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <Clock className="size-4" />
            {formatTime(currentReservation.startTime)} - {formatTime(currentReservation.endTime)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tiempo restante: {minsRemaining(currentReservation.endTime)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!currentReservation.confirmedAt && (
              <button
                type="button"
                onClick={() => onConfirmArrival(currentReservation._id)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-200"
              >
                <CheckCircle2 className="size-3.5" /> Confirmar llegada
              </button>
            )}
            <button
              type="button"
              onClick={() => onFreeTable(currentReservation._id)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-800 transition hover:bg-blue-200"
            >
              <RefreshCw className="size-3.5" /> Liberar mesa
            </button>
            {!currentReservation.confirmedAt && (
              <button
                type="button"
                onClick={() => onMarkNoShow(currentReservation._id)}
                className="flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-2 text-xs font-medium text-rose-800 transition hover:bg-rose-200"
              >
                Marcar no show
              </button>
            )}
          </div>
        </div>
      )}

      {nextReservation && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Próxima reserva
          </p>
          <p className="mt-2 flex items-center gap-2 font-medium text-slate-800">
            <User className="size-4 text-slate-500" />
            {nextReservation.customerName}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <Clock className="size-4" />
            {formatTime(nextReservation.startTime)}
          </p>
        </div>
      )}

      {!currentReservation && !nextReservation && status === "available" && (
        <p className="mt-6 text-center text-sm text-slate-500">Mesa disponible</p>
      )}
    </div>
  );
}
