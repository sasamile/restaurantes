"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  changePct?: number | null;
  sparkline?: number[];
  icon: LucideIcon;
  primaryColor: string;
  className?: string;
}

export function KPICard({
  title,
  value,
  changePct,
  sparkline,
  icon: Icon,
  primaryColor,
  className,
}: KPICardProps) {
  const id = React.useId().replace(/:/g, "");
  const maxVal = sparkline && sparkline.length > 0 ? Math.max(...sparkline, 1) : 1;
  const points =
    sparkline?.map((v, i) => {
      const x = (i / Math.max(1, sparkline.length - 1)) * 100;
      const y = 100 - (v / maxVal) * 75;
      return { x, y };
    }) ?? [];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white p-6",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-300",
        "hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
        "border border-slate-100",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-slate-500 tracking-wide">{title}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
            {value}
          </p>
          {changePct != null && changePct !== 0 && (
            <span
              className={cn(
                "mt-2 inline-flex text-xs font-medium",
                changePct > 0 ? "text-emerald-600" : "text-rose-500"
              )}
            >
              {changePct > 0 ? "+" : ""}{changePct}% vs anterior
            </span>
          )}
        </div>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${primaryColor}12`,
            color: primaryColor,
          }}
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </div>
      </div>
      {sparkline && sparkline.length > 0 && (
        <div className="mt-5 h-11 w-full">
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full block"
          >
            <defs>
              <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 40 L ${points.map((p) => `${p.x} ${5 + ((100 - p.y) / 75) * 30}`).join(" L ")} L 100 40 Z`}
              fill={`url(#spark-${id})`}
            />
            <path
              d={`M ${points.map((p) => `${p.x} ${5 + ((100 - p.y) / 75) * 30}`).join(" L ")}`}
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
