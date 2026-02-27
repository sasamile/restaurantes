import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenantPrompts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const getDefault = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenantPrompts")
      .withIndex("by_tenant_default", (q) =>
        q.eq("tenantId", args.tenantId).eq("isDefault", true)
      )
      .first();
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    prompt: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.isDefault) {
      const current = await ctx.db
        .query("tenantPrompts")
        .withIndex("by_tenant_default", (q) =>
          q.eq("tenantId", args.tenantId).eq("isDefault", true)
        )
        .first();
      if (current) await ctx.db.patch(current._id, { isDefault: false });
    }
    return await ctx.db.insert("tenantPrompts", {
      tenantId: args.tenantId,
      name: args.name,
      prompt: args.prompt,
      isDefault: args.isDefault,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tenantPrompts"),
    name: v.optional(v.string()),
    prompt: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Prompt no encontrado");

    if (args.isDefault === true) {
      const current = await ctx.db
        .query("tenantPrompts")
        .withIndex("by_tenant_default", (q) =>
          q.eq("tenantId", doc.tenantId).eq("isDefault", true)
        )
        .first();
      if (current && current._id !== args.id)
        await ctx.db.patch(current._id, { isDefault: false });
    }

    const { id, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedAt: now });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("tenantPrompts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});
