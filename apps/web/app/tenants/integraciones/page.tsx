"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useTenant } from "@/lib/tenant-context";
import { useState, useEffect } from "react";

function getWebhookUrl(tenantId: string): string {
  const convexUrl =
    (typeof window !== "undefined" && (window as unknown as { __CONVEX_URL__?: string }).__CONVEX_URL__) ||
    process.env.NEXT_PUBLIC_CONVEX_URL ||
    "";
  const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
  return `${siteUrl}/webhooks/ycloud/${tenantId}`;
}

export default function IntegracionesPage() {
  const { tenantId } = useTenant();

  const tenant = useQuery(
    api.tenants.get,
    tenantId ? { tenantId } : "skip"
  );
  const ycloud = useQuery(
    api.integrations.getYCloud,
    tenantId ? { tenantId } : "skip"
  );
  const regenerateWebhook = useMutation(
    api.integrations.regenerateWebhookPath
  );
  const saveYCloud = useMutation(api.integrations.saveYCloud);

  const [ycloudExpanded, setYcloudExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const webhookUrl = tenantId ? getWebhookUrl(tenantId) : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!tenantId) return;
    await regenerateWebhook({ tenantId });
  };

  const [phoneInput, setPhoneInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");

  useEffect(() => {
    if (ycloud?.phoneNumber !== undefined)
      setPhoneInput(ycloud.phoneNumber ?? "");
  }, [ycloud?.phoneNumber]);

  const handleSavePhone = async () => {
    if (!tenantId) return;
    await saveYCloud({ tenantId, phoneNumber: phoneInput.trim() || undefined });
  };

  const handleSaveApiKey = async () => {
    if (!tenantId) return;
    await saveYCloud({
      tenantId,
      apiKey: apiKeyInput.trim() || undefined,
    });
    setApiKeyInput(""); // Limpiar tras guardar (no mostramos el valor por seguridad)
  };

  const handleDisconnect = async () => {
    if (!tenantId) return;
    await saveYCloud({ tenantId, connected: false });
  };

  if (!tenantId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Integraciones — {tenant?.name ?? "Restaurante"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Conecta canales de mensajería (WhatsApp, etc.) para recibir y enviar
          mensajes en el Inbox.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setYcloudExpanded(!ycloudExpanded)}
            className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-[#197fe6]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#197fe6] text-2xl">
                  chat
                </span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">YCloud</h2>
                <p className="text-xs text-slate-500">
                  WhatsApp, Messenger y canales conectados
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400">
              {ycloudExpanded ? "expand_less" : "expand_more"}
            </span>
          </button>

          {ycloudExpanded && (
            <div className="border-t border-slate-200 bg-slate-50/50 p-6">
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Webhook personalizado
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Copia esta URL única en el panel de YCloud para este
                  restaurante. Conéctate aquí para recibir y enviar mensajes en
                  el Inbox.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 font-mono break-all">
                    {webhookUrl || "Cargando…"}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Regenerar webhook
                </button>
                <h3 className="mt-6 text-sm font-semibold text-slate-900 mb-2">
                  API Key de YCloud
                </h3>
                <p className="text-xs text-slate-500 mb-2">
                  Necesaria para enviar mensajes. Obténla en YCloud Console →{" "}
                  <span className="font-medium">Developers → API Keys</span>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      ycloud?.hasApiKey ? "•••••••• (dejar en blanco para mantener)" : "Introduce tu API Key"
                    }
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#197fe6] focus:outline-none focus:ring-1 focus:ring-[#197fe6]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="shrink-0 rounded-lg bg-[#197fe6] px-3 py-2.5 text-xs font-medium text-white hover:bg-[#1565c0] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!apiKeyInput.trim()}
                  >
                    Guardar API Key
                  </button>
                </div>
                {ycloud?.hasApiKey && (
                  <p className="mt-1.5 text-xs text-emerald-600">
                    API Key configurada
                  </p>
                )}
                <h3 className="mt-6 text-sm font-semibold text-slate-900 mb-2">
                  Número de WhatsApp / YCloud a conectar
                </h3>
                <p className="text-xs text-slate-500 mb-2">
                  Indica el número de teléfono que usarás en YCloud para enviar
                  y recibir mensajes (ej: +34 612 345 678).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+34 612 345 678"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#197fe6] focus:outline-none focus:ring-1 focus:ring-[#197fe6]"
                  />
                  <button
                    type="button"
                    onClick={handleSavePhone}
                    className="shrink-0 rounded-lg bg-[#197fe6] px-3 py-2.5 text-xs font-medium text-white hover:bg-[#1565c0]"
                  >
                    Guardar número
                  </button>
                </div>
                {!ycloud?.connected && (ycloud?.phoneNumber || phoneInput) && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm text-amber-800 font-medium mb-1">
                      Pendiente de validación
                    </p>
                    <p className="text-xs text-amber-700">
                      Por favor envía un mensaje desde ese número de WhatsApp
                      para validar la conexión. Cuando recibamos el primer
                      mensaje, el estado pasará a Conectado.
                    </p>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-slate-100 px-3 py-2">
                  <span className="text-[11px] text-slate-600">
                    <span className="font-semibold">Estado:</span>{" "}
                    {ycloud?.connected
                      ? "Conectado"
                      : ycloud?.phoneNumber
                        ? "Pendiente de validación"
                        : "Sin configurar"}
                  </span>
                  {ycloud?.connected && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="text-xs font-medium text-amber-600 hover:text-amber-700"
                    >
                      Desconectar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
