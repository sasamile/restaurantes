"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Link2,
  MapPin,
  Plus,
  Radio,
  Settings,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ViewMode = "day" | "week" | "map";

interface ControlHeaderProps {
  title?: string;
  subtitle?: string;
  currentDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewReservation: () => void;
  primaryColor: string;
  secondaryColor: string;
  systemOnline?: boolean;
  googleConnected?: boolean;
  botActive?: boolean;
  onImportFromGoogle?: () => void;
  importing?: boolean;
}

export function ControlHeader({
  title = "Centro de Control",
  subtitle = "Ocupación en tiempo real",
  currentDate,
  onPrevDay,
  onNextDay,
  onToday,
  viewMode,
  onViewModeChange,
  onNewReservation,
  primaryColor,
  secondaryColor,
  systemOnline = true,
  googleConnected = false,
  botActive = true,
  onImportFromGoogle,
  importing = false,
}: ControlHeaderProps) {
  return (
    <header className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                systemOnline
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  systemOnline ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              Sistema {systemOnline ? "Online" : "Offline"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                googleConnected
                  ? "bg-blue-50 text-blue-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              <Link2 className="size-3.5" strokeWidth={2} />
              Google {googleConnected ? "Conectado" : "Desconectado"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                botActive
                  ? "bg-cyan-50 text-cyan-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              <Radio className="size-3.5" strokeWidth={2} />
              Bot {botActive ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de vista */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(["day", "week", "map"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                    : "text-slate-600 hover:text-slate-900",
                )}
              >
                {mode === "day" && <Calendar className="size-4" />}
                {mode === "week" && <Activity className="size-4" />}
                {mode === "map" && <MapPin className="size-4" />}
                {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mapa"}
              </button>
            ))}
          </div>

          {/* Navegación fecha (solo día/semana) */}
          {viewMode !== "map" && (
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={onPrevDay}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={onToday}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={onNextDay}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="ml-2 px-2 text-sm font-medium text-slate-600">
                {currentDate.toLocaleDateString("es-ES", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          )}

          {/* Botón nueva reserva */}
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

              {importing ? "Importando…" : "Importar Google"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
