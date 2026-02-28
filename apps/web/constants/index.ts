import type { TenantStatus } from "../types/types";

export const STATUS_LABELS: Record<TenantStatus, string> = {
  active: "Activo",
  trial: "Prueba",
  cancelled: "Cancelado",
};

export const TABS = [
  { id: "general" as const, label: "General" },
  { id: "administradores" as const, label: "Administradores" },
  { id: "formulario" as const, label: "Formulario" },
  { id: "prompt" as const, label: "Prompt" },
] as const;

export const ROL_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  AGENT: "Editor",
  VIEWER: "Viewer",
};
