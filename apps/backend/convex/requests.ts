import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const list = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_tenant_created", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    if (args.status && args.status !== "all") {
      return rows.filter((r) => r.status === args.status);
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => ctx.db.get(args.requestId),
});

/** Último pedido de una conversación (para actualizar notas, ej. "sin cebolla") */
export const getLastByConversationId = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_conversation_created", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(1);
    return rows[0] ?? null;
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    distributorName: v.string(),
    items: v.string(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const requestId = await ctx.db.insert("requests", {
      tenantId: args.tenantId,
      distributorName: args.distributorName,
      items: args.items,
      status: "pending",
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      address: args.address,
      recipientName: args.recipientName,
      conversationId: args.conversationId,
      notes: args.notes,
      requestedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    if (args.customerPhone?.trim() || args.conversationId) {
      await ctx.scheduler.runAfter(0, internal.system.orders.notifyOrderCreated, {
        requestId,
      });
    }
    return requestId;
  },
});

export const update = mutation({
  args: {
    requestId: v.id("requests"),
    distributorName: v.optional(v.string()),
    items: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("cancelled")
      )
    ),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { requestId, ...updates } = args;
    const row = await ctx.db.get(requestId);
    if (!row) throw new Error("Pedido no encontrado");

    const clean: Record<string, unknown> = {};
    if (updates.distributorName !== undefined) clean.distributorName = updates.distributorName;
    if (updates.items !== undefined) clean.items = updates.items;
    if (updates.notes !== undefined) clean.notes = updates.notes;
    if (updates.customerName !== undefined) clean.customerName = updates.customerName;
    if (updates.customerPhone !== undefined) clean.customerPhone = updates.customerPhone;
    if (updates.address !== undefined) clean.address = updates.address;
    if (updates.recipientName !== undefined) clean.recipientName = updates.recipientName;
    if (updates.conversationId !== undefined) clean.conversationId = updates.conversationId;
    if (updates.status !== undefined) {
      clean.status = updates.status;
      if (updates.status === "delivered") clean.deliveredAt = Date.now();
    }
    clean.updatedAt = Date.now();
    await ctx.db.patch(requestId, clean);

    if (updates.status === "sent") {
      await ctx.scheduler.runAfter(0, internal.system.orders.notifyOrderDispatched, {
        requestId,
      });
    }
    return requestId;
  },
});

export const remove = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.requestId);
    if (!row) throw new Error("Pedido no encontrado");
    await ctx.db.delete(args.requestId);
    return args.requestId;
  },
});
