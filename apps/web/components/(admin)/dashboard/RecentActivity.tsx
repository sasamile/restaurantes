"use client";

import { Building2, UserPlus, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Activity = {
  type: string;
  title: string;
  timestamp: number;
  extra?: string;
};

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `hace ${mins} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7) return `hace ${days} días`;
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function ActivityIcon({ type }: { type: string }) {
  const config: Record<string, { icon: typeof Building2; bg: string; color: string }> = {
    restaurant: { icon: Building2, bg: "#EEF2FF", color: "#6366F1" },
    admin: { icon: UserPlus, bg: "#ECFDF5", color: "#10B981" },
    conversation: { icon: MessageCircle, bg: "#EFF6FF", color: "#3B82F6" },
  };
  const { icon: Icon, bg, color } = config[type] ?? config.restaurant;
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: bg }}
    >
      <Icon className="h-4 w-4" style={{ color }} />
    </div>
  );
}

export function RecentActivity({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;

  return (
    <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-8 shadow-[0_8px_20px_rgba(0,0,0,0.05)]">
      <h3 className="text-lg font-semibold text-[#0F172A]">Actividad reciente</h3>
      <div className="mt-6 space-y-0">
        {activities.map((a, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-4 py-4",
              i < activities.length - 1 && "border-b border-[#F1F5F9]"
            )}
          >
            <ActivityIcon type={a.type} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#0F172A]">
                {a.title}
                {a.extra && (
                  <span className="ml-1 text-[#64748B]">· {a.extra}</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-[#94A3B8]">{formatTime(a.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
