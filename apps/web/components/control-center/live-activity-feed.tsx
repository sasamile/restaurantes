"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  RefreshCw,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityType =
  | "arrival_confirmed"
  | "table_freed"
  | "reservation_created"
  | "no_show"
  | "table_reassigned";

interface Activity {
  _id: string;
  type: ActivityType;
  message: string;
  tableNumber?: string;
  customerName?: string;
  createdAt: number;
}

interface LiveActivityFeedProps {
  activities: Activity[];
  primaryColor: string;
}

const typeConfig: Record<
  ActivityType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  arrival_confirmed: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-100" },
  table_freed: { icon: RefreshCw, color: "text-blue-700", bg: "bg-blue-100" },
  reservation_created: { icon: Calendar, color: "text-cyan-700", bg: "bg-cyan-100" },
  no_show: { icon: AlertCircle, color: "text-rose-700", bg: "bg-rose-100" },
  table_reassigned: { icon: Table2, color: "text-amber-700", bg: "bg-amber-100" },
};

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = (now - ts) / 60000;
  if (diff < 1) return "Ahora";
  if (diff < 60) return `${Math.floor(diff)} min`;
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function LiveActivityFeed({ activities, primaryColor }: LiveActivityFeedProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-600">
        <span className="flex size-2 animate-pulse rounded-full bg-emerald-500" />
        Actividad en vivo
      </h3>
      <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Sin actividad reciente
          </p>
        ) : (
          activities.map((a) => {
            const cfg = typeConfig[a.type];
            const Icon = cfg.icon;
            return (
              <div
                key={a._id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition-all duration-200",
                  "hover:border-slate-200 hover:bg-slate-50/80"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    cfg.bg,
                    cfg.color
                  )}
                >
                  <Icon className="size-4" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{a.message}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatTime(a.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
