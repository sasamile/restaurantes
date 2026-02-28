import type { TenantWithPlan } from "@/hook/use-restaurantes-page";
import type { RestauranteFormState } from "@/types/types";

export function tenantToForm(t: TenantWithPlan): RestauranteFormState {
  return {
    name: t.name,
    status: t.status,
    planId: t.planId ?? "",
    primaryColor: t.primaryColor ?? "#dc2626",
    secondaryColor: t.secondaryColor ?? "#fef2f2",
    logoUrl: t.logoUrl ?? "",
    address: t.address ?? "",
    phone: t.phone ?? "",
    defaultPrompt: "",
  };
}

export function slugifyKey(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 48) || "campo"
  );
}
