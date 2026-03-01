"use client";

import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";

interface IntegrationBannerProps {
  primaryColor: string;
}

export function IntegrationBanner({ primaryColor }: IntegrationBannerProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5"
      style={{ borderLeft: `4px solid ${primaryColor}` }}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between p-6">
        <div className="flex items-start gap-4">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `${primaryColor}12`,
              color: primaryColor,
            }}
          >
            <MessageCircle className="size-5" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              Conecta WhatsApp para activar el Inbox
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Configura YCloud en Integraciones y empieza a recibir conversaciones.
            </p>
          </div>
        </div>
        <Link
          href="/tenants/integraciones"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.98]"
          style={{ backgroundColor: primaryColor }}
        >
          Ir a Integraciones
          <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
