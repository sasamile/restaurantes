import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) =>
    ctx.db
      .query("tables")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect(),
});

export const upsert = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    positionX: v.number(),
    positionY: v.number(),
    shape: v.union(v.literal("circle"), v.literal("rect")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    capacity: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        positionX: args.positionX,
        positionY: args.positionY,
        shape: args.shape,
        width: args.width,
        height: args.height,
        capacity: args.capacity,
        isActive: args.isActive ?? existing.isActive,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("tables", {
      tenantId: args.tenantId,
      name: args.name,
      positionX: args.positionX,
      positionY: args.positionY,
      shape: args.shape,
      width: args.width,
      height: args.height,
      capacity: args.capacity,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const seedDefault = mutation({
  args: { tenantId: v.id("tenants"), tableNames: v.array(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    if (existing.length > 0) return existing.length;
    const n = args.tableNames.length;
    const cols = Math.ceil(Math.sqrt(n));
    const ids: string[] = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      ids.push(
        await ctx.db.insert("tables", {
          tenantId: args.tenantId,
          name: args.tableNames[i],
          positionX: 10 + col * 20,
          positionY: 10 + row * 20,
          shape: "circle",
          width: 12,
          height: 12,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
      );
    }
    return ids.length;
  },
});
