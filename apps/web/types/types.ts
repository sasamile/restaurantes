import type { Id } from "@/convex";

export type TenantStatus = "active" | "trial" | "cancelled";

export type FormField = {
  id: string;
  label: string;
  key: string;
  type: "text" | "textarea";
};

export const STATUS_LABELS: Record<TenantStatus, string> = {
  active: "Activo",
  trial: "Prueba",
  cancelled: "Cancelado",
};

export const STATUS_BADGE_STYLES: Record<TenantStatus, string> = {
  active: "bg-[#DCFCE7] text-[#166534]",
  trial: "bg-[#FEF3C7] text-[#92400E]",
  cancelled: "bg-[#FEE2E2] text-[#991B1B]",
};

export interface RestauranteFormState {
  name: string;
  status: TenantStatus;
  planId: Id<"plans"> | "";
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  address: string;
  phone: string;
  defaultPrompt: string;
}

export const DEFAULT_RESTAURANTE_FORM: RestauranteFormState = {
  name: "",
  status: "active",
  planId: "",
  primaryColor: "#dc2626",
  secondaryColor: "#fef2f2",
  logoUrl: "",
  address: "",
  phone: "",
  defaultPrompt: "",
};
