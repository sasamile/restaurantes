import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Planes del SaaS
  plans: defineTable({
    name: v.string(),
    slug: v.string(),
    price: v.number(),
    maxRestaurantes: v.number(), // -1 = ilimitado
    maxUsuarios: v.number(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"]),

  // Restaurantes (tenants) del SaaS
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    status: v.union(v.literal("active"), v.literal("trial"), v.literal("cancelled")),
    planId: v.optional(v.id("plans")),
    primaryColor: v.optional(v.string()), // cada restaurante configura colores
    secondaryColor: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // Usuarios del sistema (puedes enlazar después con Convex Auth)
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.optional(v.string()), // hash bcrypt para email/password
    isSuperadmin: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"]),

  // Relación usuario ↔ restaurante + rol
  userTenants: defineTable({
    userId: v.id("users"),
    tenantId: v.id("tenants"),
    role: v.union(
      v.literal("OWNER"),
      v.literal("ADMIN"),
      v.literal("AGENT"),
      v.literal("VIEWER")
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tenant", ["tenantId"])
    .index("by_user_tenant", ["userId", "tenantId"]),

  // Integración YCloud por restaurante (webhook, credenciales)
  tenantIntegrations: defineTable({
    tenantId: v.id("tenants"),
    provider: v.literal("YCLOUD"),
    apiKey: v.optional(v.string()), // API Key de YCloud (Developers > API Keys) para enviar mensajes
    phoneNumber: v.optional(v.string()), // número WhatsApp/YCloud a conectar
    webhookSecret: v.optional(v.string()),
    webhookPath: v.string(), // ej: "tenant_xxx_yyyy" para construir URL
    connected: v.boolean(), // true solo cuando webhook recibe primer mensaje
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_provider", ["tenantId", "provider"]),

  // Conversaciones (inbox) por tenant
  conversations: defineTable({
    tenantId: v.id("tenants"),
    externalContactId: v.string(),
    customerName: v.string(),
    channel: v.union(
      v.literal("whatsapp"),
      v.literal("messenger"),
      v.literal("webchat")
    ),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("pending")
    ),
    threadId: v.optional(v.string()), // ID del thread del agente IA (RAG)
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_last_message", ["tenantId", "lastMessageAt"])
    .index("by_tenant_contact", ["tenantId", "externalContactId"])
    .index("by_thread_id", ["threadId"]),

  // Mensajes de cada conversación
  messages: defineTable({
    conversationId: v.id("conversations"),
    tenantId: v.id("tenants"),
    direction: v.union(v.literal("INBOUND"), v.literal("OUTBOUND")),
    type: v.literal("TEXT"),
    content: v.string(),
    providerMessageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_tenant", ["tenantId"]),

  // Conocimiento por restaurante (texto manual o archivo subido)
  knowledgeItems: defineTable({
    tenantId: v.id("tenants"),
    title: v.string(),
    content: v.string(),
    storageId: v.optional(v.id("_storage")), // archivo subido (txt, md, pdf)
    tags: v.optional(v.array(v.string())),
    ragEntryId: v.optional(v.string()), // ID en RAG para indexar/buscar
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),

  // Deduplicación webhook YCloud (evita procesar mismo evento dos veces)
  ycloudProcessedEvents: defineTable({
    eventId: v.string(),
  }).index("by_event_id", ["eventId"]),

  // Permisos por rol (gestionado por superadmin)
  rolePermissions: defineTable({
    role: v.union(
      v.literal("OWNER"),
      v.literal("ADMIN"),
      v.literal("AGENT"),
      v.literal("VIEWER")
    ),
    module: v.string(),
    allowed: v.boolean(),
  })
    .index("by_role", ["role"]),

  // Prompts por restaurante
  tenantPrompts: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    prompt: v.string(),
    isDefault: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_default", ["tenantId", "isDefault"]),
});
