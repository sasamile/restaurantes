"use client";

import { Plus } from "lucide-react";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="rounded-[20px] bg-white p-12 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <p className="text-[#64748B]">No hay restaurantes.</p>
      <button
        type="button"
        onClick={onCreateClick}
        className="mt-4 inline-flex items-center gap-2 rounded-[12px] px-[18px] py-[10px] text-sm font-medium text-white shadow-md transition-all duration-150 hover:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
        }}
      >
        <Plus className="h-4 w-4" />
        Crear el primero
      </button>
    </div>
  );
}
