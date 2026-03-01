"use client";

import { Users } from "lucide-react";

interface UsersEmptyStateProps {
  primaryColor: string;
  onInvite: () => void;
}

export function UsersEmptyState({ primaryColor, onInvite }: UsersEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 px-6">
      <div
        className="mb-4 flex size-16 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: `${primaryColor}15`,
          color: primaryColor,
        }}
      >
        <Users className="size-8" strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        No hay usuarios aún
      </h3>
      <p className="mb-6 max-w-sm text-center text-sm text-slate-500">
        Crea usuarios para tu restaurante. Indica nombre, correo y contraseña para cada persona.
      </p>
      <button
        type="button"
        onClick={onInvite}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
        style={{ backgroundColor: primaryColor }}
      >
        <span className="material-symbols-outlined text-lg">person_add</span>
        Crear usuario
      </button>
    </div>
  );
}
