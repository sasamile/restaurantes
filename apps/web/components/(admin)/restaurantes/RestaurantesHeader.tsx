"use client";

import { Plus } from "lucide-react";

interface RestaurantesHeaderProps {
  onCreateClick: () => void;
}

export function RestaurantesHeader({ onCreateClick }: RestaurantesHeaderProps) {
  return (
    <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">
          Restaurantes
        </h1>
        <p className="mt-1 text-[14px] font-normal text-[#64748B]">
          Gestiona los restaurantes de la plataforma.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateClick}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[12px] px-[18px] py-[10px] text-[14px] font-medium text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all duration-150 ease-out hover:scale-[0.98] hover:shadow-lg hover:saturate-110 active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
        }}
      >
        <Plus className="h-4 w-4" />
        Crear restaurante
      </button>
    </header>
  );
}
