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
import { cn } from "@/lib/utils";
import type { Id } from "@/convex";

const ROLE_OPTIONS = [
  {
    value: "OWNER" as const,
    label: "Owner",
    description: "Acceso total al tenant. Puede gestionar usuarios, configuraciones y eliminarlo.",
  },
  {
    value: "ADMIN" as const,
    label: "Admin",
    description: "Acceso total al tenant excepto transferir propiedad o eliminarlo.",
  },
  {
    value: "AGENT" as const,
    label: "Operador",
    description: "Solo acceso a Inbox, pedidos y conversaciones. No puede editar configuración.",
  },
  {
    value: "VIEWER" as const,
    label: "Solo lectura",
    description: "Puede ver contenido pero no editar ni gestionar usuarios.",
  },
] as const;

interface ChangeRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  currentRole: string;
  userTenantId: Id<"userTenants">;
  primaryColor: string;
  onSave: (userTenantId: Id<"userTenants">, role: "OWNER" | "ADMIN" | "AGENT" | "VIEWER") => Promise<void>;
}

export function ChangeRoleModal({
  open,
  onOpenChange,
  userName,
  currentRole,
  userTenantId,
  primaryColor,
  onSave,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = React.useState<string>(currentRole);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedRole(currentRole);
      setSuccess(false);
    }
  }, [open, currentRole]);

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(userTenantId, selectedRole as "OWNER" | "ADMIN" | "AGENT" | "VIEWER");
      setSuccess(true);
      setTimeout(() => onOpenChange(false), 400);
    } catch {
      // Error handled by caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar rol</DialogTitle>
          <p className="text-sm text-slate-500">
            Actualiza el rol de <span className="font-medium text-slate-700">{userName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelectedRole(role.value)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-all duration-200",
                selectedRole === role.value
                  ? "border-2 ring-2 ring-offset-2"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              )}
              style={
                selectedRole === role.value
                  ? {
                      borderColor: primaryColor,
                      boxShadow: `0 0 0 2px ${primaryColor}40`,
                    }
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{role.label}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{role.description}</p>
                </div>
                {selectedRole === role.value && (
                  <span
                    className="shrink-0 size-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <svg
                      className="size-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedRole === currentRole}
            className={cn(
              "transition-all duration-300",
              success && "scale-95 opacity-90"
            )}
            style={
              selectedRole !== currentRole && !saving
                ? {
                    backgroundColor: primaryColor,
                  }
                : undefined
            }
          >
            {saving ? "Guardando…" : success ? "¡Listo!" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
