import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pqrs")
      .withIndex("by_tenant_created", (q) => q.eq("tenantId", args.tenantId))
      .collect();

    let filtered = rows;
    if (args.status && args.status !== "all") {
      filtered = filtered.filter((r) => r.status === args.status);
    }
    if (args.type && args.type !== "all") {
      filtered = filtered.filter((r) => r.type === args.type);
    }
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { pqrId: v.id("pqrs") },
  handler: async (ctx, args) => ctx.db.get(args.pqrId),
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    type: v.union(
      v.literal("petition"),
      v.literal("complaint"),
      v.literal("claim")
    ),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    subject: v.string(),
    description: v.string(),
    source: v.optional(
      v.union(
        v.literal("whatsapp"),
        v.literal("web"),
        v.literal("presencial"),
        v.literal("email")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("pqrs", {
      tenantId: args.tenantId,
      type: args.type,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      subject: args.subject,
      description: args.description,
      status: "open",
      source: args.source,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    pqrId: v.id("pqrs"),
    status: v.optional(
      v.union(
        v.literal("open"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("closed")
      )
    ),
    assignedTo: v.optional(v.id("users")),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { pqrId, ...updates } = args;
    const row = await ctx.db.get(pqrId);
    if (!row) throw new Error("PQR no encontrado");

    const clean: Record<string, unknown> = {};
    if (updates.status !== undefined) {
      clean.status = updates.status;
      if (updates.status === "resolved" || updates.status === "closed") {
        clean.resolvedAt = Date.now();
      }
    }
    if (updates.assignedTo !== undefined) clean.assignedTo = updates.assignedTo;
    if (updates.resolutionNotes !== undefined) clean.resolutionNotes = updates.resolutionNotes;
    clean.updatedAt = Date.now();
    await ctx.db.patch(pqrId, clean);
    return pqrId;
  },
});

export const remove = mutation({
  args: { pqrId: v.id("pqrs") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.pqrId);
    if (!row) throw new Error("PQR no encontrado");
    await ctx.db.delete(args.pqrId);
    return args.pqrId;
  },
});
