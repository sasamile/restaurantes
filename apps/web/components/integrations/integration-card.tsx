"use client";

import Image from "next/image";
import { type IntegrationDefinition, type IntegrationStatus } from "@/lib/integrations-catalog";
import { cn } from "@/lib/utils";
import { Check, ExternalLink } from "lucide-react";

interface IntegrationCardProps {
  integration: IntegrationDefinition;
  status: IntegrationStatus;
  primaryColor: string;
  onClick: () => void;
  /** Si false, la tarjeta está deshabilitada (no clickeable) */
  disabled?: boolean;
}

export function IntegrationCard({
  integration,
  status,
  primaryColor,
  onClick,
  disabled: disabledProp,
}: IntegrationCardProps) {
  const Icon = integration.icon;
  const hasImage = Boolean(integration.imageSrc);
  const isDisabled = disabledProp ?? !integration.enabledForUsers;
  const showAsDisabled = isDisabled || status === "coming_soon";

  const statusConfig = {
    connected: {
      label: "Conectado",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badge: true,
      showConnect: false,
    },
    not_connected: {
      label: "No conectado",
      className: "bg-slate-100 text-slate-600 border-slate-200",
      badge: true,
      showConnect: true,
    },
    pending_config: {
      label: "Requiere configuración",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      badge: true,
      showConnect: true,
    },
    error: {
      label: "Error de configuración",
      className: "bg-red-50 text-red-700 border-red-200",
      badge: true,
      showConnect: true,
    },
    coming_soon: {
      label: "Próximamente",
      className: "bg-slate-100 text-slate-500 border-slate-200",
      badge: true,
      showConnect: false,
    },
  };

  const config = statusConfig[status];
  const isConnected = status === "connected";
  const isComingSoon = status === "coming_soon" || showAsDisabled;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={showAsDisabled}
      className={cn(
        "group relative flex w-full flex-col items-start rounded-2xl border bg-white p-6 text-left transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isConnected && "border-2",
        showAsDisabled && "cursor-not-allowed opacity-80 hover:shadow-md hover:translate-y-0"
      )}
      style={{
        borderColor: isConnected ? primaryColor : undefined,
        boxShadow: isConnected
          ? `0 0 0 1px ${primaryColor}20, 0 4px 12px rgba(0,0,0,0.06)`
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* Logo: imagen o icono */}
      <div
        className="mb-4 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundColor: hasImage ? "transparent" : `${integration.color}15` }}
      >
        {hasImage && integration.imageSrc ? (
          <Image
            src={integration.imageSrc}
            alt={integration.name}
            width={56}
            height={56}
            className="object-contain p-1"
          />
        ) : (
          <Icon
            className="size-7"
            style={{ color: integration.color }}
            strokeWidth={2}
          />
        )}
      </div>

      {/* Nombre */}
      <h3 className="mb-1 text-base font-semibold text-slate-900">
        {integration.name}
      </h3>

      {/* Descripción */}
      <p className="mb-4 line-clamp-2 min-h-10 text-sm text-slate-500">
        {integration.description}
      </p>

      {/* Estado */}
      <div className="mt-auto flex w-full flex-col gap-3">
        {config.badge && (
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              config.className
            )}
          >
            {isConnected && (
              <Check
                className="size-3.5 animate-in zoom-in duration-300"
                strokeWidth={2.5}
              />
            )}
            {config.label}
          </span>
        )}

        {config.showConnect && !showAsDisabled && (
          <span
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: primaryColor }}
          >
            <ExternalLink className="size-4" strokeWidth={2} />
            Conectar
          </span>
        )}

        {showAsDisabled && (
          <span className="text-xs text-slate-400">Disponible próximamente</span>
        )}
      </div>
    </button>
  );
}
