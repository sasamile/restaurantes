"use client";

import { formatPrice } from "@/lib/format-price";

type DataPoint = { month: string; value: number };

export function RevenueChart({
  data,
  mrr,
  activeRestaurants,
}: {
  data: DataPoint[];
  mrr: number;
  activeRestaurants: number;
}) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const width = 400;
  const height = 160;
  const pad = { t: 16, r: 16, b: 32, l: 0 };
  const chartW = width - pad.l - pad.r;
  const chartH = height - pad.t - pad.b;

  const points = values.map((v, i) => {
    const x = pad.l + (i / (values.length - 1 || 1)) * chartW;
    const y = pad.t + chartH - ((v - min) / range) * chartH;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#0F172A]">
            Ingresos mensuales
          </h3>
          <div className="relative mt-6 h-[200px] w-full max-w-[500px]">
            <svg
              viewBox={`0 0 ${width} ${height + pad.t + pad.b}`}
              className="h-full w-full"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                <line
                  key={pct}
                  x1={pad.l}
                  y1={pad.t + (1 - pct) * chartH}
                  x2={width - pad.r}
                  y2={pad.t + (1 - pct) * chartH}
                  stroke="#F1F5F9"
                  strokeWidth={1}
                />
              ))}
              {/* Line chart */}
              <path
                d={pathD}
                fill="none"
                stroke="#EF4444"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* X labels */}
              {data.map((d, i) => {
                const x = pad.l + (i / (data.length - 1 || 1)) * chartW;
                return (
                  <text
                    key={i}
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-[#64748B] text-[10px]"
                  >
                    {d.month}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 lg:w-48">
          <div>
            <p className="text-xs font-medium text-[#64748B]">MRR actual</p>
            <p className="text-xl font-bold text-[#0F172A]">
              ${formatPrice(mrr)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B]">Restaurantes activos</p>
            <p className="text-xl font-bold text-[#0F172A]">{activeRestaurants}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[#64748B]">Promedio por restaurante</p>
            <p className="text-xl font-bold text-[#0F172A]">
              ${formatPrice(activeRestaurants > 0 ? Math.round(mrr / activeRestaurants) : 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
