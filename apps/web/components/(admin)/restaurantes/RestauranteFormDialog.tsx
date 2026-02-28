"use client";

import { useState, useRef } from "react";
import type { Id } from "@/convex";
import { useAction } from "convex/react";
import { api } from "@/convex";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestauranteFormState } from "@/types/types";

interface Plan {
  _id: Id<"plans">;
  name: string;
  price: number;
}

interface RestauranteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RestauranteFormState;
  setForm: React.Dispatch<React.SetStateAction<RestauranteFormState>>;
  editingId: Id<"tenants"> | null;
  plans: Plan[] | undefined;
  onSubmit: (e: React.FormEvent) => void;
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function RestauranteFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editingId,
  plans,
  onSubmit,
}: RestauranteFormDialogProps) {
  const generateUploadUrl = useAction(api.s3Logo.generateLogoUploadUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setLogoError("Formato no válido. Usa PNG, JPEG, WebP o SVG.");
      return;
    }
    setLogoError(null);
    setLogoUploading(true);
    try {
      const { uploadUrl, publicUrl } = await generateUploadUrl({
        fileName: file.name,
        contentType: file.type,
        tenantId: editingId ?? undefined,
      });
      const res = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("Error al subir la imagen");
      setForm((prev) => ({ ...prev, logoUrl: publicUrl }));
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Error al subir el logo");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
      fileInputRef.current?.value && (fileInputRef.current.value = "");
    }
  };

  const removeLogo = () => setForm((prev) => ({ ...prev, logoUrl: "" }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Editar restaurante" : "Crear restaurante"}
          </DialogTitle>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={onSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">
              Nombre
            </label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre del restaurante"
              className="mt-1 border-[#E2E8F0] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">
              Plan
            </label>
            <select
              value={form.planId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  planId: e.target.value as Id<"plans"> | "",
                }))
              }
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
            >
              <option value="">Sin plan</option>
              {plans?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} — ${p.price}/mes
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">
              Estado
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as RestauranteFormState["status"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
            >
              <option value="active">Activo</option>
              <option value="trial">Prueba</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-sm font-medium text-[#0F172A]">
              Logo del restaurante
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleLogoChange}
              disabled={logoUploading}
              className="hidden"
              aria-label="Subir logo"
            />
            {form.logoUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                  <Image
                    src={form.logoUrl}
                    alt="Logo"
                    fill
                    className="object-contain"
                    unoptimized={form.logoUrl.includes("fincasya.s3.") || form.logoUrl.includes("mezzi.s3.")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={logoUploading}
                    className="border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
                  >
                    {logoUploading ? "Subiendo…" : "Cambiar logo"}
                  </Button>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-left text-sm text-[#64748B] underline hover:text-[#EF4444]"
                  >
                    Quitar logo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="w-fit border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
                >
                  {logoUploading ? "Subiendo…" : "Subir logo"}
                </Button>
                <p className="text-xs text-[#64748B]">
                  PNG, JPEG, WebP o SVG. Tamaño recomendado &lt; 2 MB.
                </p>
              </div>
            )}
            {logoError && (
              <p className="text-sm text-[#EF4444]">{logoError}</p>
            )}
          </div>
          <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-sm font-medium text-[#0F172A]">
              Colores de la marca
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <label className="w-24 shrink-0 text-sm text-[#64748B]">
                  Primario
                </label>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white p-0.5 shadow-sm"
                    title="Color primario"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="min-w-0 flex-1 border-[#E2E8F0] font-mono text-sm focus:border-[#EF4444] focus:ring-[#EF4444]/20"
                    placeholder="#dc2626"
                  />
                </div>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <label className="w-24 shrink-0 text-sm text-[#64748B]">
                  Secundario
                </label>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-[#E2E8F0] bg-white p-0.5 shadow-sm"
                    title="Color secundario"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, secondaryColor: e.target.value }))
                    }
                    className="min-w-0 flex-1 border-[#E2E8F0] font-mono text-sm focus:border-[#EF4444] focus:ring-[#EF4444]/20"
                    placeholder="#fef2f2"
                  />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">
              Dirección
            </label>
            <Input
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Dirección"
              className="mt-1 border-[#E2E8F0]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">
              Teléfono
            </label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Teléfono"
              className="mt-1 border-[#E2E8F0]"
            />
          </div>
          {!editingId && (
            <div>
              <label className="block text-sm font-medium text-[#0F172A]">
                Prompt por defecto (opcional)
              </label>
              <textarea
                rows={3}
                value={form.defaultPrompt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, defaultPrompt: e.target.value }))
                }
                placeholder="Instrucciones del asistente virtual"
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#EF4444] focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20"
              />
            </div>
          )}
          </div>
          <DialogFooter className="shrink-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-[12px] bg-[#EF4444] px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:scale-[0.98] hover:bg-[#DC2626] active:scale-[0.98]"
            >
              {editingId ? "Guardar" : "Crear"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
