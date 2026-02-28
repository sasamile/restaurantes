"use client";

import { Plus } from "lucide-react";

export function PlansHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold text-[#0F172A]">Planes</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Configura los planes de suscripción y límites para tus restaurantes.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-180 ease-out hover:-translate-y-0.5 hover:shadow-lg"
        style={{
          background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Crear plan
      </button>
    </div>
  );
}
