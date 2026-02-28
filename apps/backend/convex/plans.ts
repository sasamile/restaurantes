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
    price: v.number(),
    priceAnnual: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("plans", {
      name: args.name,
      price: args.price,
      priceAnnual: args.priceAnnual,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    priceAnnual: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { planId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
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
    await ctx.db.insert("plans", { name: "Básico", price: 0, priceAnnual: 0, createdAt: now });
    await ctx.db.insert("plans", { name: "Pro", price: 49, priceAnnual: 470, createdAt: now });
    await ctx.db.insert("plans", { name: "Empresa", price: 149, priceAnnual: 1430, createdAt: now });
    return "Planes creados";
  },
});
