"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type TableStatus = "available" | "reserved" | "occupied" | "no_show" | "inactive";

interface Mesa {
  _id: string;
  name: string;
  positionX: number;
  positionY: number;
  shape: "circle" | "rect";
  width?: number;
  height?: number;
  status: TableStatus;
  currentReservation?: {
    customerName: string;
    startTime: number;
    endTime: number;
    status: string;
    confirmedAt?: number;
  };
  nextReservation?: {
    customerName: string;
    startTime: number;
    endTime: number;
  };
}

interface MesaMapViewProps {
  tables: Mesa[];
  selectedMesa: Mesa | null;
  onSelectMesa: (mesa: Mesa | null) => void;
  primaryColor: string;
}

const statusConfig: Record<TableStatus, { bg: string; border: string; text: string }> = {
  available: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800" },
  reserved: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  occupied: { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-800" },
  no_show: { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-800" },
  inactive: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-500" },
};

export function MesaMapView({
  tables,
  selectedMesa,
  onSelectMesa,
  primaryColor,
}: MesaMapViewProps) {
  const isEmpty = tables.length === 0;

  return (
    <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      {isEmpty ? (
        <div className="flex h-80 flex-col items-center justify-center text-center">
          <MapPin className="size-16 text-slate-300" strokeWidth={1} />
          <p className="mt-4 text-sm font-medium text-slate-600">
            No hay mesas configuradas
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Configura las mesas en la base de conocimiento o usa las reservas para inferir
          </p>
        </div>
      ) : (
        <div className="relative h-full min-h-[350px] w-full">
          {tables.map((mesa) => {
            const cfg = statusConfig[mesa.status];
            const isSelected = selectedMesa?._id === mesa._id;
            const size = mesa.width ?? 48;
            return (
              <button
                key={mesa._id}
                type="button"
                onClick={() => onSelectMesa(isSelected ? null : mesa)}
                className={cn(
                  "absolute flex items-center justify-center rounded-xl border-2 font-semibold transition-all duration-300 shadow-sm",
                  mesa.shape === "circle" ? "rounded-full" : "",
                  cfg.bg,
                  cfg.border,
                  cfg.text,
                  isSelected && "ring-2 ring-offset-2 ring-slate-900 ring-offset-white shadow-lg",
                  "hover:scale-105 hover:shadow-md"
                )}
                style={{
                  left: `${mesa.positionX}%`,
                  top: `${mesa.positionY}%`,
                  width: size,
                  height: mesa.height ?? size,
                  transform: "translate(-50%, -50%)",
                }}
                title={`Mesa ${mesa.name} - ${mesa.status}`}
              >
                {mesa.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
