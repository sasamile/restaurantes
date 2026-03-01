"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Reservation {
  _id: string;
  customerName: string;
  tableNumber?: string;
  startTime: number;
  endTime: number;
  status: string;
  source: string;
}

interface TimelineViewProps {
  reservations: Reservation[];
  dayStart: number;
  hoursShown?: number; // ej: 6
  primaryColor: string;
}

export function TimelineView({
  reservations,
  dayStart,
  hoursShown = 6,
  primaryColor,
}: TimelineViewProps) {
  const now = Date.now();
  const windowEnd = dayStart + hoursShown * 60 * 60 * 1000;
  const windowStart = Math.max(dayStart, now - 60 * 60 * 1000); // últimas 1h + futuro
  const totalMs = windowEnd - windowStart;
  const filtered = reservations.filter(
    (r) =>
      r.status !== "cancelled" &&
      r.status !== "no_show" &&
      r.endTime > windowStart &&
      r.startTime < windowEnd
  );

  const getLeft = (ts: number) => ((ts - windowStart) / totalMs) * 100;
  const getWidth = (start: number, end: number) =>
    (Math.min(end, windowEnd) - Math.max(start, windowStart)) / totalMs * 100;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
        Próximas {hoursShown}h
      </p>
      <div className="relative h-20 w-full overflow-x-auto rounded-xl bg-slate-100">
        <div className="absolute inset-0 flex items-center">
          {filtered.map((r) => {
            const left = Math.max(0, getLeft(r.startTime));
            const width = Math.min(100 - left, getWidth(r.startTime, r.endTime));
            const isVirtual = r.source === "virtual";
            return (
              <div
                key={r._id}
                className="absolute flex min-w-[80px] flex-col rounded-lg border px-2 py-1.5 text-xs shadow-sm ring-1 ring-slate-900/5"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 8)}%`,
                  backgroundColor: isVirtual ? "rgb(207 250 254)" : "rgb(254 243 199)",
                  borderColor: isVirtual ? "rgb(34 211 238)" : "rgb(251 191 36)",
                }}
                title={`${r.customerName} - Mesa ${r.tableNumber ?? "?"}`}
              >
                <span className="truncate font-semibold text-slate-900">{r.customerName}</span>
                <span className="truncate text-slate-600">
                  Mesa {r.tableNumber ?? "-"} · {new Date(r.startTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
