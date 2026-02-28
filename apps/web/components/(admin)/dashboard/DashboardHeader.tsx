"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

type TimeRange = "7d" | "30d" | "current";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardHeader() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const userName = user?.name ?? user?.email ?? "Admin";

  const labels: Record<TimeRange, string> = {
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    current: "Mes actual",
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[30px] font-semibold text-[#0F172A]">
          {getGreeting()}, {userName}
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Vista general del SaaS de restaurantes. Control financiero y operativo.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC]"
          >
            {labels[timeRange]}
            <ChevronDown className="h-4 w-4 text-[#64748B]" />
          </button>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg">
                {(["7d", "30d", "current"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setTimeRange(opt);
                      setDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm transition",
                      timeRange === opt
                        ? "bg-[#F1F5F9] font-medium text-[#0F172A]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    )}
                  >
                    {labels[opt]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition hover:bg-[#F8FAFC] active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          Exportar datos
        </button>
      </div>
    </div>
  );
}
