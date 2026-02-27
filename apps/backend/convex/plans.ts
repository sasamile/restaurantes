import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("plans").order("asc").collect();
  },
});

export const get = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.planId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    price: v.number(),
    maxRestaurantes: v.number(),
    maxUsuarios: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("plans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("Ya existe un plan con ese slug");
    return await ctx.db.insert("plans", {
      name: args.name,
      slug: args.slug,
      price: args.price,
      maxRestaurantes: args.maxRestaurantes,
      maxUsuarios: args.maxUsuarios,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    price: v.optional(v.number()),
    maxRestaurantes: v.optional(v.number()),
    maxUsuarios: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { planId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (filtered.slug) {
      const existing = await ctx.db
        .query("plans")
        .withIndex("by_slug", (q) => q.eq("slug", filtered.slug as string))
        .first();
      if (existing && existing._id !== planId)
        throw new Error("Ya existe un plan con ese slug");
    }
    await ctx.db.patch(planId, filtered);
    return planId;
  },
});

export const remove = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.planId);
    return args.planId;
  },
});

/** Crear planes iniciales. Ejecutar desde dashboard Convex: plans.seed → Run */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existing = await ctx.db.query("plans").first();
    if (existing) throw new Error("Ya existen planes. Elimínalos primero si quieres re-seed.");
    await ctx.db.insert("plans", { name: "Básico", slug: "basico", price: 0, maxRestaurantes: 1, maxUsuarios: 2, createdAt: now });
    await ctx.db.insert("plans", { name: "Pro", slug: "pro", price: 49, maxRestaurantes: 5, maxUsuarios: 10, createdAt: now });
    await ctx.db.insert("plans", { name: "Empresa", slug: "empresa", price: 149, maxRestaurantes: -1, maxUsuarios: -1, createdAt: now });
    return "Planes creados";
  },
});
