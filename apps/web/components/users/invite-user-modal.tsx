"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ROLE_OPTIONS = [
  { value: "OWNER" as const, label: "Owner", description: "Propietario del restaurante" },
  { value: "ADMIN" as const, label: "Admin", description: "Acceso total" },
  { value: "AGENT" as const, label: "Operador", description: "Inbox y pedidos" },
  { value: "VIEWER" as const, label: "Solo lectura", description: "Solo visualización" },
] as const;

type Role = (typeof ROLE_OPTIONS)[number]["value"];

export interface CreateUserFormData {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryColor: string;
  onCreateUser: (data: CreateUserFormData) => Promise<void>;
}

export function InviteUserModal({
  open,
  onOpenChange,
  primaryColor,
  onCreateUser,
}: InviteUserModalProps) {
  const [form, setForm] = React.useState<CreateUserFormData>({
    name: "",
    email: "",
    password: "",
    role: "AGENT",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", password: "", role: "AGENT" });
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;
    setSaving(true);
    try {
      await onCreateUser(form);
      onOpenChange(false);
    } catch {
      // Error handled by caller
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.name.trim().length > 0 && form.email.trim().length > 0 && form.password.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <p className="text-sm text-slate-500">
            Crea un nuevo usuario para este restaurante. Ingresa nombre, email y contraseña.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nombre
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Juan Pérez"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@ejemplo.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Rol
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            style={isValid && !saving ? { backgroundColor: primaryColor } : undefined}
          >
            {saving ? "Creando…" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
