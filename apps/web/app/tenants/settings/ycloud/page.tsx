"use client";

import { useParams } from "next/navigation";
import { integrations, tenants } from "../../../../lib/mock-data";

export default function TenantYCloudSettingsPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const tenant = tenants.find((t) => t.id === tenantId);

  const integration = integrations.find(
    (i) => i.tenantId === tenantId && i.provider === "YCLOUD",
  );

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-50">
          YCloud — {tenant?.name ?? "Restaurante"}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configura la integración de YCloud para este restaurante. Cada
          tenant tiene su propio webhook y credenciales.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2.2fr),minmax(0,2.8fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
            <h2 className="text-sm font-semibold text-zinc-50">
              Webhook para YCloud
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Copia este webhook en el panel de YCloud para este restaurante.
            </p>
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {integration?.webhookUrl ??
                    "https://tu-saas.com/webhooks/ycloud/:tenantId"}
                </span>
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                  {integration?.connected ? "Conectado" : "Pendiente"}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:border-zinc-500"
            >
              Regenerar webhook
            </button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
            <h2 className="text-sm font-semibold text-zinc-50">
              Credenciales de YCloud
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Estas credenciales se guardan en el backend (beemo-ai) asociadas
              al <code className="text-[11px]">tenant_id</code>.
            </p>
            <form className="mt-3 space-y-3">
              <div className="space-y-1 text-xs">
                <label
                  htmlFor="ycloud-api-key"
                  className="block text-zinc-300"
                >
                  API Key de YCloud
                </label>
                <input
                  id="ycloud-api-key"
                  type="password"
                  placeholder="ycloud_xxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-50 outline-none ring-0 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/40"
                />
              </div>
              <div className="space-y-1 text-xs">
                <label
                  htmlFor="ycloud-webhook-secret"
                  className="block text-zinc-300"
                >
                  Webhook secret
                </label>
                <input
                  id="ycloud-webhook-secret"
                  type="password"
                  placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-50 outline-none ring-0 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-500/40"
                />
              </div>
              <button
                type="button"
                className="mt-1 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200"
              >
                Guardar credenciales
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
          <h2 className="text-sm font-semibold text-zinc-50">
            Cómo se ve en el backend
          </h2>
          <p className="mt-2 text-xs text-zinc-400">
            El backend estilo beemo-ai puede tener algo como:
          </p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-zinc-900 p-3 text-[11px] text-zinc-200">
{`POST /webhooks/ycloud/:tenantId
  - Valida la firma con webhook_secret del tenant.
  - Localiza el tenant y la integración YCloud.
  - Normaliza el evento (mensaje entrante, estado, etc.).
  - Crea/actualiza conversación e inserta mensaje.
  - Llama al motor de IA con:
      - tenant_id
      - prompt por defecto del tenant
      - conocimiento relevante (vector search)
      - últimos N mensajes de la conversación.

POST /tenants/:tenantId/integrations/ycloud
  - Ruta protegida (rol OWNER/ADMIN).
  - Guarda api_key + webhook_secret cifrados.
  - Genera o regenera el webhook único de este tenant.`}
          </pre>
        </div>
      </div>
    </div>
  );
}

