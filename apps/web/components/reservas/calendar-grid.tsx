"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ReservationBlock } from "./reservation-block";
import type { Id } from "@/convex";

type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed" | "no_show";

interface Reservation {
  _id: Id<"reservations">;
  customerName: string;
  startTime: number;
  endTime: number;
  tableNumber?: string;
  status: ReservationStatus;
  source?: string;
  extraData?: string;
}

interface CalendarGridProps {
  viewMode: "day" | "week";
  dayStart: number; // inicio día 00:00
  reservations: Reservation[];
  onReservationClick: (r: Reservation) => void;
  primaryColor: string;
}

const HOUR_HEIGHT = 64;
const HOURS_DISPLAYED = 14; // 8:00 - 22:00
const FIRST_HOUR = 8;

function getDayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function getWeekStart(d: Date): number {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function CalendarGrid({
  viewMode,
  dayStart,
  reservations,
  onReservationClick,
}: CalendarGridProps) {
  const now = Date.now();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calcular rango visible
  const baseDate = new Date(dayStart);
  baseDate.setHours(FIRST_HOUR, 0, 0, 0);
  const windowStart = baseDate.getTime();
  const windowEnd = windowStart + HOURS_DISPLAYED * 60 * 60 * 1000;

  const columns: { label: string; date: Date; dayStart: number }[] = [];

  if (viewMode === "day") {
    columns.push({
      label: new Date(dayStart).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
      date: new Date(dayStart),
      dayStart,
    });
  } else {
    const weekStart = getWeekStart(new Date(dayStart));
    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      columns.push({
        label: days[i] + " " + d.getDate(),
        date: d,
        dayStart: d.getTime(),
      });
    }
  }

  const getPosition = (start: number, end: number, colDayStart: number) => {
    const colDayEnd = colDayStart + 24 * 60 * 60 * 1000;
    const colBase = new Date(colDayStart);
    colBase.setHours(FIRST_HOUR, 0, 0, 0);
    const colWindowStart = colBase.getTime();
    const colWindowEnd = colWindowStart + HOURS_DISPLAYED * 60 * 60 * 1000;

    if (end <= colDayStart || start >= colDayEnd) return null;
    const visStart = Math.max(start, colWindowStart);
    const visEnd = Math.min(end, colWindowEnd);
    if (visStart >= visEnd) return null;

    const totalMs = colWindowEnd - colWindowStart;
    const top = ((visStart - colWindowStart) / totalMs) * 100;
    const height = ((visEnd - visStart) / totalMs) * 100;
    return { top, height };
  };

  /** Asignar lane (0,1,2...) a cada reserva para evitar superposición */
  function assignLanes(
    cols: { dayStart: number }[],
    resList: Reservation[]
  ): Map<string, { lane: number; totalLanes: number }> {
    const map = new Map<string, { lane: number; totalLanes: number }>();
    cols.forEach((col) => {
      const dayRes = resList
        .filter((r) => getDayStart(new Date(r.startTime)) === col.dayStart)
        .map((r) => ({ r, pos: getPosition(r.startTime, r.endTime, col.dayStart) }))
        .filter((x): x is { r: Reservation; pos: { top: number; height: number } } => x.pos != null)
        .sort((a, b) => a.pos.top - b.pos.top);

      const lanes: { end: number; lane: number }[] = [];
      const resToLane: { r: Reservation; lane: number }[] = [];

      dayRes.forEach(({ r, pos }) => {
        const blockEnd = pos.top + pos.height;
        let assigned = -1;
        for (let i = 0; i < lanes.length; i++) {
          if (lanes[i].end <= pos.top) {
            assigned = i;
            lanes[i] = { end: blockEnd, lane: i };
            break;
          }
        }
        if (assigned < 0) {
          assigned = lanes.length;
          lanes.push({ end: blockEnd, lane: assigned });
        }
        resToLane.push({ r, lane: assigned });
      });

      const maxLane = Math.max(0, ...resToLane.map((x) => x.lane));
      const totalLanes = maxLane + 1;
      resToLane.forEach(({ r, lane }) => {
        map.set(r._id, { lane, totalLanes });
      });
    });
    return map;
  }

  const laneMap = React.useMemo(
    () => assignLanes(columns, reservations),
    [columns, reservations]
  );

  const showNowLine =
    viewMode === "day" &&
    now >= windowStart &&
    now <= windowEnd &&
    now >= dayStart &&
    now < dayStart + 24 * 60 * 60 * 1000;

  const nowLineTop =
    showNowLine
      ? ((now - windowStart) / (HOURS_DISPLAYED * 60 * 60 * 1000)) * 100
      : -1;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5"
    >
      {/* Header columnas */}
      <div
        className="grid border-b border-slate-200 bg-slate-50/80"
        style={{
          gridTemplateColumns: viewMode === "day" ? "56px 1fr" : "56px repeat(7, 1fr)",
        }}
      >
        <div className="border-r border-slate-200 p-2" />
        {columns.map((col) => (
          <div
            key={col.label}
            className="border-r border-slate-200 p-2 text-center text-sm font-medium text-slate-700 last:border-r-0"
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="relative overflow-x-auto overflow-y-auto" style={{ maxHeight: HOUR_HEIGHT * HOURS_DISPLAYED }}>
        <div
          className="grid min-w-[600px]"
          style={{
            gridTemplateColumns: viewMode === "day" ? "56px 1fr" : "56px repeat(7, 1fr)",
          }}
        >
          {/* Columna horas (alineada con cuadrícula) */}
          <div className="border-r border-slate-200 bg-slate-50/50">
            {Array.from({ length: HOURS_DISPLAYED }, (_, i) => {
              const h = FIRST_HOUR + i;
              return (
                <div
                  key={h}
                  className="border-b border-slate-200 pr-2 text-right text-xs text-slate-500"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              );
            })}
          </div>

          {/* Celdas día/semana con cuadrícula por hora (estilo Google Calendar) */}
          {columns.map((col) => {
            const colDayBase = new Date(col.dayStart);
            colDayBase.setHours(FIRST_HOUR, 0, 0, 0);
            const colWindowStart = colDayBase.getTime();
            const colWindowEnd = colWindowStart + HOURS_DISPLAYED * 60 * 60 * 1000;

            return (
              <div
                key={col.dayStart}
                className="relative border-r border-slate-200 last:border-r-0"
                style={{ minHeight: HOUR_HEIGHT * HOURS_DISPLAYED }}
              >
                {/* Cuadrícula: una fila por hora con línea inferior */}
                {Array.from({ length: HOURS_DISPLAYED }, (_, i) => (
                  <div
                    key={i}
                    className="border-b border-slate-200"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Línea roja hora actual (solo vista día) */}
                {viewMode === "day" && showNowLine && col.dayStart === dayStart && nowLineTop >= 0 && (
                  <div
                    className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                    style={{ top: `${nowLineTop}%`, transform: "translateY(-50%)" }}
                  >
                    <div className="absolute left-0 right-0 h-0.5 bg-rose-500" />
                    <div className="absolute -left-1 size-2 rounded-full bg-rose-500" />
                  </div>
                )}

                {/* Bloques de reserva (con lanes para evitar superposición) */}
                {reservations
                  .filter((r) => {
                    const resDay = getDayStart(new Date(r.startTime));
                    return resDay === col.dayStart;
                  })
                  .map((r) => {
                    const pos = getPosition(r.startTime, r.endTime, col.dayStart);
                    if (!pos) return null;
                    const laneInfo = laneMap.get(r._id);
                    const totalLanes = laneInfo?.totalLanes ?? 1;
                    const lane = laneInfo?.lane ?? 0;
                    const gap = 1;
                    const leftPct = lane * ((100 - gap * (totalLanes - 1)) / totalLanes) + lane * gap;
                    const widthPct = (100 - gap * (totalLanes - 1)) / totalLanes;
                    return (
                      <div
                        key={r._id}
                        className="absolute z-1"
                        style={{
                          top: `${pos.top}%`,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          height: `${pos.height}%`,
                          minHeight: 24,
                        }}
                      >
                        <ReservationBlock
                          reservation={r}
                          onClick={() => onReservationClick(r)}
                          className="h-full"
                        />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
