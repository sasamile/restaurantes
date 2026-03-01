"use client";

import * as React from "react";
import { MessageCircle, Brain, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegrationsStatusProps {
  ycloudConnected: boolean;
  primaryColor: string;
}

const integrations = [
  {
    id: "whatsapp",
    name: "WhatsApp / YCloud",
    icon: MessageCircle,
    connected: (ctx: { ycloudConnected: boolean }) => ctx.ycloudConnected,
  },
  {
    id: "ai",
    name: "IA",
    icon: Brain,
    connected: () => true,
  },
  {
    id: "payments",
    name: "Pagos",
    icon: CreditCard,
    connected: () => false,
  },
];

export function IntegrationsStatus({
  ycloudConnected,
  primaryColor,
}: IntegrationsStatusProps) {
  const ctx = { ycloudConnected };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-1">
        {integrations.map((int) => {
          const Icon = int.icon;
          const connected = int.connected(ctx);
          return (
            <div
              key={int.id}
              className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3.5 transition-colors",
                connected
                  ? "bg-emerald-50/80"
                  : "bg-slate-50/80"
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  connected ? "bg-emerald-100" : "bg-slate-200"
                )}
              >
                <Icon
                  className={cn("size-4", connected ? "text-emerald-600" : "text-slate-400")}
                  strokeWidth={2}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {int.name}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    connected ? "text-emerald-600" : "text-slate-500"
                  )}
                >
                  {connected ? "Conectado" : "No conectado"}
                </p>
              </div>
              {connected && (
                <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
