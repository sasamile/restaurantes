"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, parsePrice } from "@/lib/format-price";
import type { PlanFormState } from "@/hook/use-planes-page";

interface PlanFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: PlanFormState;
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>;
  onSubmit: (e: React.FormEvent) => void;
}

export function PlanFormModal({
  open,
  onOpenChange,
  editingId,
  form,
  setForm,
  onSubmit,
}: PlanFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0F172A]">
            {editingId ? "Editar plan" : "Crear plan"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A]">Nombre</label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pro"
              className="mt-1 border-[#E2E8F0] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A]">
                Precio mensual ($/mes)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatPrice(form.price)}
                onChange={(e) =>
                  setForm({ ...form, price: parsePrice(e.target.value) })
                }
                placeholder="0"
                className="mt-1 border-[#E2E8F0] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A]">
                Precio anual ($/año)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatPrice(form.priceAnnual)}
                onChange={(e) =>
                  setForm({ ...form, priceAnnual: parsePrice(e.target.value) })
                }
                placeholder="0"
                className="mt-1 border-[#E2E8F0] focus:border-[#EF4444] focus:ring-[#EF4444]/20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-4 sm:gap-0">
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
              className="inline-flex items-center justify-center rounded-xl bg-[#EF4444] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#DC2626]"
            >
              {editingId ? "Guardar" : "Crear"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
