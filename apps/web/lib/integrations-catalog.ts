import type { LucideIcon } from "lucide-react";
import {
  MessageCircle,
  MessageSquare,
  HardDrive,
  Brain,
  CreditCard,
  Calendar,
} from "lucide-react";

export type IntegrationCategory =
  | "messaging"
  | "calendar"
  | "storage"
  | "ai"
  | "payments";

export type IntegrationStatus =
  | "connected"
  | "not_connected"
  | "pending_config"
  | "error"
  | "coming_soon";

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: LucideIcon;
  color: string; // Color de marca para el logo
  implemented: boolean;
  /** Ruta a imagen (ej. /icons/ycloud.png) en lugar de icono Lucide */
  imageSrc?: string;
  /** Si false, la tarjeta está deshabilitada hasta que la integración esté lista para usuarios */
  enabledForUsers?: boolean;
  features?: string[]; // Funcionalidades que habilita (ej: "Inbox")
}

export const INTEGRATION_CATEGORIES: Record<
  IntegrationCategory,
  { label: string; icon: LucideIcon }
> = {
  messaging: { label: "Mensajería", icon: MessageCircle },
  calendar: { label: "Calendario", icon: Calendar },
  storage: { label: "Almacenamiento", icon: HardDrive },
  ai: { label: "Inteligencia artificial", icon: Brain },
  payments: { label: "Pagos", icon: CreditCard },
};

export const INTEGRATIONS_CATALOG: IntegrationDefinition[] = [
  {
    id: "ycloud",
    name: "YCloud",
    description: "WhatsApp, Messenger y canales de mensajería unificados.",
    category: "messaging",
    icon: MessageSquare,
    color: "#25D366",
    implemented: true,
    imageSrc: "/icons/ycloud.png",
    enabledForUsers: true,
    features: ["Inbox"],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincroniza las reservas con tu calendario de Google.",
    category: "calendar",
    icon: Calendar,
    color: "#4285F4",
    implemented: true,
    imageSrc: "/icons/calendar.png",
    enabledForUsers: true,
    features: ["Reservas"],
  },
];
