import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { tenantId: v.id("tenants"), city: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("jobLocations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId));
    const rows = await q.collect();
    if (args.city?.trim()) {
      const c = args.city.trim().toLowerCase();
      return rows.filter((r) => r.city.toLowerCase().includes(c));
    }
    return rows.sort((a, b) => a.city.localeCompare(b.city) || a.mallName.localeCompare(b.mallName));
  },
});

export const get = query({
  args: { id: v.id("jobLocations") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    city: v.string(),
    mallName: v.string(),
    isPrincipal: v.optional(v.boolean()),
    vacancies: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("jobLocations", {
      tenantId: args.tenantId,
      city: args.city.trim(),
      mallName: args.mallName.trim(),
      isPrincipal: args.isPrincipal ?? false,
      vacancies: args.vacancies.filter((v) => v.trim()).map((v) => v.trim().toUpperCase()),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("jobLocations"),
    city: v.optional(v.string()),
    mallName: v.optional(v.string()),
    isPrincipal: v.optional(v.boolean()),
    vacancies: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Ubicación no encontrada");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.city !== undefined) patch.city = updates.city.trim();
    if (updates.mallName !== undefined) patch.mallName = updates.mallName.trim();
    if (updates.isPrincipal !== undefined) patch.isPrincipal = updates.isPrincipal;
    if (updates.vacancies !== undefined) {
      patch.vacancies = updates.vacancies.filter((v) => v.trim()).map((v) => v.trim().toUpperCase());
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("jobLocations") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Ubicación no encontrada");
    await ctx.db.delete(args.id);
    return args.id;
  },
});
