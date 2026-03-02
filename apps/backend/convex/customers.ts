import {
  mutation,
  query,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

/** Lista clientes del tenant */
export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

/** Obtiene un cliente por ID */
export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Obtiene cliente por tenant y teléfono/contactId (para la IA) */
export const getByTenantAndContact = query({
  args: {
    tenantId: v.id("tenants"),
    externalContactId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_tenant_contact", (q) =>
        q.eq("tenantId", args.tenantId).eq("externalContactId", args.externalContactId)
      )
      .unique();
  },
});

/** Crea un cliente */
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    externalContactId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    preferences: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("customers", {
      tenantId: args.tenantId,
      externalContactId: args.externalContactId.trim(),
      name: args.name.trim(),
      email: args.email?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      preferences: args.preferences?.trim() || undefined,
      lastContactAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Actualiza un cliente */
export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    preferences: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("Cliente no encontrado");
    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.email !== undefined) patch.email = updates.email?.trim() || undefined;
    if (updates.notes !== undefined) patch.notes = updates.notes?.trim() || undefined;
    if (updates.preferences !== undefined) patch.preferences = updates.preferences?.trim() || undefined;
    await ctx.db.patch(id, patch);
    return id;
  },
});

/** Elimina un cliente */
export const remove = mutation({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Cliente no encontrado");
    await ctx.db.delete(args.id);
    return args.id;
  },
});

/** Upsert desde conversación (nombre + contacto); usado por getOrCreateForAgent */
export const upsertFromConversation = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    externalContactId: v.string(),
    customerName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_tenant_contact", (q) =>
        q.eq("tenantId", args.tenantId).eq("externalContactId", args.externalContactId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.customerName.trim() || existing.name,
        lastContactAt: now,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("customers", {
      tenantId: args.tenantId,
      externalContactId: args.externalContactId,
      name: args.customerName.trim() || "Cliente",
      lastContactAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});
