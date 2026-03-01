"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Link2, List, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export type ViewMode = "day" | "week" | "list";

interface ReservasHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewReservation: () => void;
  primaryColor: string;
  googleConnected?: boolean;
  onImportFromGoogle?: () => void;
  importing?: boolean;
  /** Navegación calendario: solo se muestra en vista Día o Semana */
  currentDate?: Date;
  onPrev?: () => void;
  onNext?: () => void;
  onGoToday?: () => void;
}

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function ReservasHeader({
  viewMode,
  onViewModeChange,
  onNewReservation,
  primaryColor,
  googleConnected = false,
  onImportFromGoogle,
  importing = false,
  currentDate,
  onPrev,
  onNext,
  onGoToday,
}: ReservasHeaderProps) {
  const showNav = (viewMode === "day" || viewMode === "week") && currentDate && onPrev && onNext && onGoToday;
  const navLabel = React.useMemo(() => {
    if (!currentDate || !showNav) return "";
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
    }
    const start = getWeekStart(currentDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString("es-ES", { month: "short" })} ${end.getFullYear()}`;
  }, [currentDate, viewMode, showNav]);

  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Reservas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona reservas por hora, cliente y mesa
          </p>

          {showNav && (
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                title={viewMode === "day" ? "Día anterior" : "Semana anterior"}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={onGoToday}
                className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                title="Ir a hoy"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={onNext}
                className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                title={viewMode === "day" ? "Día siguiente" : "Semana siguiente"}
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="ml-2 text-sm font-medium capitalize text-slate-700">{navLabel}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                googleConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              )}
            >
              <Link2 className="size-3.5" strokeWidth={2} />
              Google Calendar {googleConnected ? "Conectado" : "No conectado"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Día | Semana | Lista */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(["day", "week", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {mode === "day" && <Calendar className="size-4" />}
                {mode === "week" && <CalendarDays className="size-4" />}
                {mode === "list" && <List className="size-4" />}
                {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Vista Lista"}
              </button>
            ))}
          </div>

          {/* Nueva reserva */}
          <button
            type="button"
            onClick={onNewReservation}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="size-5" strokeWidth={2.5} />
            Nueva reserva
          </button>

          {onImportFromGoogle && googleConnected && (
            <button
              type="button"
              onClick={onImportFromGoogle}
              disabled={importing}
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
               <Image
                src="/icons/google-calendar.svg"
                alt="Google Calendar"
                width={20}
                height={20}
              /> 

              {importing ? "sincronizando..." : "Sincronizar "}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
