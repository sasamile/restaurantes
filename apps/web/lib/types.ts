export type Role = "OWNER" | "ADMIN" | "AGENT" | "VIEWER";

export interface Tenant {
  id: string;
  name: string;
  status: "active" | "trial" | "cancelled";
  createdAt: string;
}

export interface TenantIntegration {
  id: string;
  tenantId: string;
  provider: "YCLOUD";
  webhookUrl: string;
  connected: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
}

export interface UserTenant {
  id: string;
  userId: string;
  tenantId: string;
  role: Role;
}

export interface Conversation {
  id: string;
  tenantId: string;
  externalContactId: string;
  customerName: string;
  channel: "whatsapp" | "messenger" | "webchat";
  status: "open" | "closed" | "pending";
  lastMessageAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  tenantId: string;
  direction: "INBOUND" | "OUTBOUND";
  type: "TEXT";
  content: string;
  createdAt: string;
}

export interface KnowledgeItem {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  tags?: string[];
  updatedAt: string;
}

export interface TenantPrompt {
  id: string;
  tenantId: string;
  name: string;
  prompt: string;
  isDefault: boolean;
  updatedAt: string;
}

