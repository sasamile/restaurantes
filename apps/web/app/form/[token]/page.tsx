"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex";
import { useState, useMemo } from "react";

const DEFAULT_PRIMARY = "#EF4444";
const DEFAULT_SECONDARY = "#0F172A";

/** Vista previa en vivo: skeleton tipo SuperadminShell (rail lateral + panel principal) */
function ThemePreview({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div
      className="flex overflow-hidden rounded-2xl border border-[#E2E8F0] bg-linear-to-b from-white to-slate-50/80 shadow-sm"
      style={{ minHeight: 160 }}
    >
      {/* Rail lateral (como el aside del shell) */}
      <aside
        className="flex w-10 shrink-0 flex-col items-center justify-between rounded-l-2xl p-1.5"
        style={{ backgroundColor: `${primary}12` }}
      >
        <div
          className="h-6 w-6 rounded-md"
          style={{ backgroundColor: primary }}
        />
        <div className="flex flex-col gap-1.5">
          <div
            className="h-5 w-5 rounded-full"
            style={{ backgroundColor: primary, opacity: 0.9 }}
          />
          <div
            className="h-5 w-5 rounded-full opacity-50"
            style={{ backgroundColor: primary }}
          />
          <div
            className="h-5 w-5 rounded-full opacity-50"
            style={{ backgroundColor: primary }}
          />
        </div>
        <div
          className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
          style={{ backgroundColor: primary }}
        >
          S
        </div>
      </aside>
      {/* Panel principal (como el main del shell) */}
      <div className="flex min-w-0 flex-1 flex-col rounded-r-2xl border-l border-[#E2E8F0] bg-white/80 p-2">
        <div
          className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-white/50 bg-white/60 p-2.5 shadow-sm ring-1 ring-black/5"
          style={{ borderColor: `${secondary}20` }}
        >
          {/* Líneas tipo contenido */}
          <div className="h-2 w-3/4 rounded" style={{ backgroundColor: `${secondary}25` }} />
          <div className="h-2 w-1/2 rounded" style={{ backgroundColor: `${secondary}20` }} />
          <div className="h-2 w-1/3 rounded" style={{ backgroundColor: `${secondary}15` }} />
          <div className="mt-2 h-5 w-16 rounded-lg" style={{ backgroundColor: primary }} />
        </div>
      </div>
    </div>
  );
}

export default function PublicFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const data = useQuery(
    api.tenantForm.getByToken,
    token ? { token } : "skip"
  );
  const submitByToken = useMutation(api.tenantForm.submitByToken);

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const includeColorTheme =
    data?.status === "valid" && data?.config
      ? (data.config.includeColorTheme ?? false)
      : false;

  const payload = useMemo(() => {
    const base = { ...responses };
    if (includeColorTheme) {
      base.primaryColor = primaryColor;
      base.secondaryColor = secondaryColor;
    }
    return base;
  }, [responses, includeColorTheme, primaryColor, secondaryColor]);

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-[#64748B]">Cargando...</p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[#0F172A]">Enlace no válido</h1>
          <p className="mt-2 text-sm text-[#64748B]">Este enlace no existe o ha expirado.</p>
        </div>
      </div>
    );
  }

  if (data.status === "used") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 w-full max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-[#E2E8F0]/50">
            {/* Detalle de fondo */}
            <div className="absolute inset-0 bg-[linear-gradient(160deg,transparent_50%,#F1F5F9_100%)] opacity-60" />
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-100/50 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-slate-100/80 blur-xl" />

            <div className="relative">
              <div className="animate-in zoom-in-50 duration-300 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 ring-4 ring-amber-50">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="animate-in fade-in slide-in-from-bottom-2 mt-6 text-2xl font-bold text-[#0F172A] duration-300 delay-150">
                Formulario ya enviado
              </h1>
              <p className="animate-in fade-in slide-in-from-bottom-2 mt-3 text-sm leading-relaxed text-[#64748B] duration-300 delay-200">
                Este formulario solo puede enviarse una vez y ya fue completado.
              </p>
              <div className="animate-in fade-in slide-in-from-bottom-2 mt-6 flex flex-col gap-2 rounded-xl bg-slate-50/80 px-4 py-3 text-left text-sm text-[#475569] duration-300 delay-300">
                <p className="font-medium text-[#0F172A]">¿Necesitas enviar algo más?</p>
                <p>Pide al restaurante que genere un nuevo enlace para poder rellenar otro formulario.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (data.status === "valid" && !data.config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[#0F172A]">Formulario no configurado</h1>
          <p className="mt-2 text-sm text-[#64748B]">El restaurante aún no ha definido los campos de este formulario.</p>
        </div>
      </div>
    );
  }

  const config = data.status === "valid" ? data.config! : null;
  const tenantName = data.tenantName ?? "Restaurante";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSending(true);
    setError(null);
    try {
      await submitByToken({ token, responses: JSON.stringify(payload) });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[#0F172A]">Respuesta enviada</h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Gracias. Tu información ha sido guardada correctamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-[#0F172A]">
            {config?.title}
          </h1>
          {tenantName && (
            <p className="mt-1 text-sm text-[#64748B]">{tenantName}</p>
          )}
          <p className="mt-3 text-sm text-[#64748B]">
            Este formulario es de un solo uso. Rellena los datos y envía.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {config?.fields.map((field) => (
              <div key={field.id}>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={responses[field.key] ?? ""}
                    onChange={(e) =>
                      setResponses((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
                    placeholder={field.label}
                  />
                ) : (
                  <input
                    type="text"
                    value={responses[field.key] ?? ""}
                    onChange={(e) =>
                      setResponses((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}

            {includeColorTheme && (
              <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Colores de tu negocio
                </h3>
                <p className="text-xs text-[#64748B]">
                  Elige cómo quieres que se vea la plataforma. La vista previa se actualiza al instante.
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
                      Color primario
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
                      Color secundario
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white p-0.5"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A]"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <span className="mb-2 block text-xs font-medium text-[#64748B]">
                    Vista previa
                  </span>
                  <ThemePreview primary={primaryColor} secondary={secondaryColor} />
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-[#EF4444]">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-[#EF4444] px-4 py-3 text-sm font-semibold text-white hover:bg-[#DC2626] disabled:opacity-50"
            >
              {sending ? "Enviando..." : "Enviar formulario"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
