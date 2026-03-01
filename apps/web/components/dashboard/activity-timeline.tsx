"use client";

import * as React from "react";
import Link from "next/link";
import {
  MessageSquare,
  UserPlus,
  Link2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityType =
  | "conversation"
  | "user_invited"
  | "integration_connected"
  | "escalated";

interface Activity {
  type: ActivityType;
  title: string;
  description?: string;
  time: number;
  href?: string;
}

interface ActivityTimelineProps {
  activities: Activity[];
  primaryColor: string;
  maxItems?: number;
}

const icons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  conversation: MessageSquare,
  user_invited: UserPlus,
  integration_connected: Link2,
  escalated: ArrowUpRight,
};

function formatTime(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "Ahora";
  if (sec < 3600) return `Hace ${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `Hace ${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `Hace ${Math.floor(sec / 86400)}d`;
  return new Date(ts).toLocaleDateString();
}

export function ActivityTimeline({
  activities,
  primaryColor,
  maxItems = 8,
}: ActivityTimelineProps) {
  const items = activities.slice(0, maxItems);

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Sin actividad reciente
        </p>
      ) : (
        <ul className="space-y-0">
          {items.map((a, i) => {
            const Icon = icons[a.type];
            const content = (
              <div className="flex items-start gap-3">
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${primaryColor}12`,
                    color: primaryColor,
                  }}
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  {a.description && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatTime(a.time)}
                  </p>
                </div>
              </div>
            );

            return (
              <li
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2.5 transition-colors",
                  a.href && "hover:bg-slate-50"
                )}
              >
                {a.href ? (
                  <Link href={a.href} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
