"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DayData {
  date: number;
  count: number;
  label: string;
}

interface WeekHeatmapViewProps {
  weekStart: number;
  dayCounts: DayData[];
  primaryColor: string;
}

export function WeekHeatmapView({
  weekStart,
  dayCounts,
  primaryColor,
}: WeekHeatmapViewProps) {
  const maxCount = Math.max(...dayCounts.map((d) => d.count), 1);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500">
        Ocupación por día (heatmap)
      </p>
      <div className="grid grid-cols-7 gap-3">
        {dayCounts.map((day) => {
          const intensity = day.count / maxCount;
          return (
            <div
              key={day.date}
              className="flex flex-col items-center rounded-xl border border-slate-200 p-3 ring-1 ring-slate-900/5"
              style={{
                backgroundColor: `color-mix(in srgb, ${primaryColor} ${intensity * 20}%, white)`,
              }}
            >
              <span className="text-2xl font-bold tabular-nums text-slate-900">
                {day.count}
              </span>
              <span className="mt-1 text-xs text-slate-600">{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
