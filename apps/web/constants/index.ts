import type { TenantStatus } from "../types/types";

export const STATUS_LABELS: Record<TenantStatus, string> = {
  active: "Activo",
  trial: "Prueba",
  cancelled: "Cancelado",
};

export const TABS = [
  { id: "general" as const, label: "General" },
  { id: "modulos" as const, label: "Módulos" },
  { id: "administradores" as const, label: "Administradores" },
  { id: "formulario" as const, label: "Formulario" },
  { id: "prompt" as const, label: "Prompt" },
] as const;

export const TENANT_MODULES = [
  { key: "pqr" as const, label: "PQR", description: "Peticiones, quejas y reclamos desde el chat" },
  { key: "pedidos" as const, label: "Pedidos", description: "Tomar y gestionar pedidos por WhatsApp" },
  { key: "reservas" as const, label: "Reservas", description: "Reservar mesas desde el chat" },
  { key: "conocimiento" as const, label: "Conocimiento / Aprendizaje", description: "Base de conocimiento y RAG para el Bot" },
] as const;

export const ROL_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  AGENT: "Editor",
  VIEWER: "Viewer",
};
