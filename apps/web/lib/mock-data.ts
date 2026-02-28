import {
  Conversation,
  KnowledgeItem,
  Message,
  Role,
  Tenant,
  TenantIntegration,
  TenantPrompt,
  User,
  UserTenant,
} from "./types";

export const currentUser: User = {
  id: "user_1",
  name: "Superadmin Demo",
  email: "superadmin@demo.com",
  isSuperadmin: true,
};

export const tenants: Tenant[] = [
  {
    id: "tenant_1",
    name: "Restaurante La Parrilla",
    status: "active",
    createdAt: "2025-01-10T12:00:00Z",
  },
  {
    id: "tenant_2",
    name: "Pizzería Napoli",
    status: "trial",
    createdAt: "2025-02-01T09:30:00Z",
  },
];

export const userTenants: UserTenant[] = tenants.map((tenant, index) => ({
  id: `ut_${index + 1}`,
  userId: currentUser.id,
  tenantId: tenant.id,
  role: "OWNER" as Role,
}));

export const integrations: TenantIntegration[] = [
  {
    id: "int_1",
    tenantId: "tenant_1",
    provider: "YCLOUD",
    webhookUrl:
      "https://tu-saas.com/webhooks/ycloud/tenant_1_xxxxxxxxxxxxxxxxxx",
    connected: true,
  },
  {
    id: "int_2",
    tenantId: "tenant_2",
    provider: "YCLOUD",
    webhookUrl:
      "https://tu-saas.com/webhooks/ycloud/tenant_2_xxxxxxxxxxxxxxxxxx",
    connected: false,
  },
];

export const conversations: Conversation[] = [
  {
    id: "conv_1",
    tenantId: "tenant_1",
    externalContactId: "whatsapp:+573001112233",
    customerName: "Carlos Pérez",
    channel: "whatsapp",
    status: "open",
    lastMessageAt: "2025-02-15T14:20:00Z",
  },
  {
    id: "conv_2",
    tenantId: "tenant_1",
    externalContactId: "whatsapp:+573009998877",
    customerName: "María Gómez",
    channel: "whatsapp",
    status: "pending",
    lastMessageAt: "2025-02-15T13:45:00Z",
  },
];

export const messages: Message[] = [
  {
    id: "msg_1",
    conversationId: "conv_1",
    tenantId: "tenant_1",
    direction: "INBOUND",
    type: "TEXT",
    content: "Hola, ¿tienen mesa para hoy a las 8 pm?",
    createdAt: "2025-02-15T14:18:00Z",
  },
  {
    id: "msg_2",
    conversationId: "conv_1",
    tenantId: "tenant_1",
    direction: "OUTBOUND",
    type: "TEXT",
    content:
      "¡Hola Carlos! Sí, tenemos disponibilidad. ¿Para cuántas personas es la reserva?",
    createdAt: "2025-02-15T14:19:00Z",
  },
];

export const knowledgeItems: KnowledgeItem[] = [
  {
    id: "k_1",
    tenantId: "tenant_1",
    title: "Horario de atención",
    content:
      "Lunes a viernes de 12:00 a 22:00. Sábados y domingos de 13:00 a 23:00.",
    tags: ["horarios"],
    updatedAt: "2025-02-10T10:00:00Z",
  },
  {
    id: "k_2",
    tenantId: "tenant_1",
    title: "Política de reservas",
    content:
      "Las reservas se mantienen hasta 15 minutos después de la hora acordada.",
    tags: ["reservas"],
    updatedAt: "2025-02-11T11:30:00Z",
  },
];

export const tenantPrompts: TenantPrompt[] = [
  {
    id: "p_1",
    tenantId: "tenant_1",
    name: "Prompt base restaurante",
    prompt:
      "Eres el asistente virtual del restaurante La Parrilla. Respondes en tono cercano y profesional. Prioriza reservas y resolución de dudas frecuentes sobre horario, menú y ubicación.",
    isDefault: true,
    updatedAt: "2025-02-12T12:00:00Z",
  },
];

