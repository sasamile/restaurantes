"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex";
import type { Id } from "@/convex";
import { sileo } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  SettingsField,
  settingsControlClass,
  settingsTextareaClass,
} from "@/components/settings/settings-field";

/**
 * Deben coincidir con los de `lib/customerInactivity.ts`. Aquí solo se usan como
 * placeholder: si el campo queda vacío, el backend pone el texto por defecto, y
 * duplicar la cadena en el estado del formulario haría que el panel guardara una
 * copia congelada que ya no seguiría a la del backend.
 */
const DEFAULT_CHECK_IN_MESSAGE =
  "¿Sigues ahí? 😊 Si todavía necesitas ayuda, cuéntame y seguimos con tu solicitud.";
const DEFAULT_CLOSING_MESSAGE =
  "Como no he recibido respuesta, voy a cerrar esta conversación por ahora. Si necesitas algo más, escríbeme cuando quieras y con gusto te ayudo. ¡Gracias por comunicarte con nosotros! 🙌";

export type ConversationInactivityValue = {
  enabled: boolean;
  checkInMinutes: number;
  closeMinutes: number;
  checkInMessage?: string;
  closingMessage?: string;
  skipWhenOpenPqr?: boolean;
};

type Props = {
  tenantId: Id<"tenants">;
  token: string | null;
  primaryColor: string;
  value?: ConversationInactivityValue | null;
};

export function ConversationInactivitySection({
  tenantId,
  token,
  primaryColor,
  value,
}: Props) {
  const save = useMutation(api.tenants.setConversationInactivity);

  const [form, setForm] = React.useState({
    enabled: false,
    checkInMinutes: "15",
    closeMinutes: "20",
    checkInMessage: "",
    closingMessage: "",
    skipWhenOpenPqr: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!value) return;
    setForm({
      enabled: value.enabled,
      checkInMinutes: String(value.checkInMinutes ?? 15),
      closeMinutes: String(value.closeMinutes ?? 20),
      checkInMessage: value.checkInMessage ?? "",
      closingMessage: value.closingMessage ?? "",
      skipWhenOpenPqr: value.skipWhenOpenPqr !== false,
    });
  }, [value]);

  const checkIn = Number(form.checkInMinutes);
  const close = Number(form.closeMinutes);
  const rangoInvalido =
    !Number.isFinite(checkIn) || !Number.isFinite(close) || checkIn < 1;
  const ordenInvalido = !rangoInvalido && close <= checkIn;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || rangoInvalido || ordenInvalido) return;
    setSaving(true);
    setSaved(false);
    try {
      await save({
        token,
        tenantId,
        enabled: form.enabled,
        checkInMinutes: checkIn,
        closeMinutes: close,
        checkInMessage: form.checkInMessage.trim() || undefined,
        closingMessage: form.closingMessage.trim() || undefined,
        skipWhenOpenPqr: form.skipWhenOpenPqr,
      });
      setSaved(true);
      sileo.success({
        title: "Cierre automático guardado",
        description: form.enabled
          ? `El bot preguntará a los ${checkIn} min y cerrará a los ${close} min de silencio.`
          : "El cierre automático quedó desactivado.",
      });
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      sileo.error({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "No se pudo guardar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SettingsSection
        title="Cierre automático de conversaciones"
        description="Qué hace el bot cuando el cliente deja de responder."
      >
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              Activar seguimiento por inactividad
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              El tiempo se cuenta desde el último mensaje del cliente. Si vuelve
              a escribir, el conteo empieza de nuevo.
            </span>
          </span>
        </label>

        {/*
          Aviso fijo, no un toast: se puede guardar una configuración entera de
          minutos y textos con la casilla apagada, y entonces el bot no hace
          absolutamente nada. Sin este cartel eso parece un fallo del sistema en
          vez de una casilla sin marcar.
        */}
        {!form.enabled && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            <strong className="font-semibold">
              El seguimiento está desactivado.
            </strong>{" "}
            Los tiempos y mensajes de abajo se guardan, pero el bot no
            preguntará ni cerrará ninguna conversación hasta que marques la
            casilla.
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <SettingsField
            id="inactivity-checkin"
            label="Preguntar «¿sigues ahí?» a los"
            description="Minutos de silencio del cliente."
            error={rangoInvalido ? "Debe ser un número de 1 minuto o más." : null}
          >
            <input
              id="inactivity-checkin"
              type="number"
              min={1}
              max={1440}
              value={form.checkInMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, checkInMinutes: e.target.value }))
              }
              className={settingsControlClass}
            />
          </SettingsField>
          <SettingsField
            id="inactivity-close"
            label="Despedirse y cerrar a los"
            description="Minutos de silencio del cliente."
            error={
              ordenInvalido
                ? "El cierre debe ser posterior a la pregunta."
                : null
            }
          >
            <input
              id="inactivity-close"
              type="number"
              min={2}
              max={1440}
              value={form.closeMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, closeMinutes: e.target.value }))
              }
              className={settingsControlClass}
            />
          </SettingsField>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.skipWhenOpenPqr}
            onChange={(e) =>
              setForm((f) => ({ ...f, skipWhenOpenPqr: e.target.checked }))
            }
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">
              No cerrar chats con una PQR sin resolver
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Esas conversaciones las cierra una persona. Ten en cuenta que
              seguirán abiertas mientras la PQR no se marque como resuelta.
            </span>
          </span>
        </label>
      </SettingsSection>

      <SettingsSection
        title="Mensajes"
        description="Déjalos vacíos para usar los textos por defecto."
      >
        <SettingsField
          id="inactivity-checkin-message"
          label="Mensaje de seguimiento"
          description="Se envía al cumplirse el primer tiempo."
        >
          <textarea
            id="inactivity-checkin-message"
            rows={2}
            value={form.checkInMessage}
            onChange={(e) =>
              setForm((f) => ({ ...f, checkInMessage: e.target.value }))
            }
            placeholder={DEFAULT_CHECK_IN_MESSAGE}
            className={settingsTextareaClass}
          />
        </SettingsField>
        <SettingsField
          id="inactivity-closing-message"
          label="Mensaje de despedida"
          description="Se envía justo antes de cerrar el caso."
        >
          <textarea
            id="inactivity-closing-message"
            rows={3}
            value={form.closingMessage}
            onChange={(e) =>
              setForm((f) => ({ ...f, closingMessage: e.target.value }))
            }
            placeholder={DEFAULT_CLOSING_MESSAGE}
            className={settingsTextareaClass}
          />
        </SettingsField>
      </SettingsSection>

      <div className="sticky bottom-0 z-10 flex items-center gap-3 rounded-xl border border-border bg-background/95 px-5 py-4 backdrop-blur-sm">
        <button
          type="submit"
          disabled={saving || rangoInvalido || ordenInvalido || !token}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-opacity disabled:opacity-60",
            saved && "bg-emerald-600"
          )}
          style={!saved ? { backgroundColor: primaryColor } : undefined}
        >
          {saving ? (
            <>
              <Loader2 size={15} className="animate-spin" strokeWidth={1.7} />
              Guardando…
            </>
          ) : saved ? (
            <>
              <Check size={15} strokeWidth={2} />
              Guardado
            </>
          ) : form.enabled ? (
            "Guardar cambios"
          ) : (
            "Guardar (desactivado)"
          )}
        </button>
        {!form.enabled && !saving && !saved && (
          <span className="text-sm text-muted-foreground">
            Marca la casilla de arriba para que el bot actúe.
          </span>
        )}
      </div>
    </form>
  );
}
