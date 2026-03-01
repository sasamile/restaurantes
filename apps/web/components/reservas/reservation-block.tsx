"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ReservationStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "no_show";

const STATUS_CONFIG: Record<
  ReservationStatus,
  { bg: string; border: string; text: string }
> = {
  confirmed: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-900" },
  pending: { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-900" },
  cancelled: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-600" },
  completed: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" },
  no_show: { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-900" },
};

interface ReservationBlockProps {
  reservation: {
    _id: string;
    customerName: string;
    startTime: number;
    endTime: number;
    tableNumber?: string;
    status: ReservationStatus;
    source?: string;
    extraData?: string;
  };
  onClick: () => void;
  className?: string;
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

export function ReservationBlock({
  reservation,
  onClick,
  className,
}: ReservationBlockProps) {
  const cfg = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.pending;
  const partySize = parsePartySize(reservation.extraData);
  const timeStr = `${new Date(reservation.startTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} – ${new Date(reservation.endTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-lg border px-3 py-2 text-left shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1",
        cfg.bg,
        cfg.border,
        cfg.text,
        className
      )}
    >
      <p className="truncate font-semibold text-inherit">{reservation.customerName}</p>
      <p className="mt-0.5 text-xs opacity-90">{timeStr}</p>
      <div className="mt-1 flex flex-wrap gap-2 text-xs">
        {reservation.tableNumber && (
          <span>Mesa {reservation.tableNumber}</span>
        )}
        {partySize != null && (
          <span>· {partySize} pers.</span>
        )}
      </div>
    </button>
  );
}
