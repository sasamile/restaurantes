"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SparklineChartProps {
  data: number[];
  primaryColor: string;
  secondaryColor?: string;
  height?: number;
  className?: string;
  showArea?: boolean;
}

export function SparklineChart({
  data,
  primaryColor,
  secondaryColor,
  height = 80,
  className,
  showArea = true,
}: SparklineChartProps) {
  const gradientId = React.useId().replace(/:/g, "");

  if (!data || data.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center text-slate-300", className)}
        style={{ minHeight: height }}
      >
        <span className="text-xs">Sin datos</span>
      </div>
    );
  }

  const width = 100;
  const pad = 6;
  const max = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = max - minVal || 1;
  const chartWidth = width - pad * 2;
  const chartHeight = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = pad + chartHeight - ((v - minVal) / range) * chartHeight * 0.9;
    return { x, y };
  });

  const lineD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const areaD = `${lineD} L ${points[points.length - 1].x} ${height - pad} L ${pad} ${height - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("w-full overflow-visible", className)}
      style={{ minHeight: height }}
    >
      <defs>
        <linearGradient id={`grad-${gradientId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && (
        <path
          d={areaD}
          fill={`url(#grad-${gradientId})`}
        />
      )}
      <path
        d={lineD}
        fill="none"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
