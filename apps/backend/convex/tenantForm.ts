import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const fieldValidator = v.object({
  id: v.string(),
  label: v.string(),
  key: v.string(),
  type: v.union(v.literal("text"), v.literal("textarea")),
});

// --- Form config (superadmin edita en tab Formulario) ---

export const getConfig = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenantFormConfig")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
  },
});

export const saveConfig = mutation({
  args: {
    tenantId: v.id("tenants"),
    title: v.string(),
    fields: v.array(fieldValidator),
    includeColorTheme: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tenantFormConfig")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
    const patch = {
      title: args.title,
      fields: args.fields,
      updatedAt: now,
      ...(args.includeColorTheme !== undefined && { includeColorTheme: args.includeColorTheme }),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("tenantFormConfig", {
      tenantId: args.tenantId,
      title: args.title,
      fields: args.fields,
      includeColorTheme: args.includeColorTheme ?? false,
      updatedAt: now,
    });
  },
});

// --- Share link (un token por enlace; válido una sola vez al enviar) ---

export const getOrCreateShare = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tenantFormShare")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("usedAt"), undefined))
      .first();
    if (existing) return { token: existing.token, shareId: existing._id };
    const token = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const id = await ctx.db.insert("tenantFormShare", {
      tenantId: args.tenantId,
      token,
      createdAt: now,
    });
    return { token, shareId: id };
  },
});

/** Generar nuevo enlace (p. ej. después de que uno ya fue usado) */
export const createNewShare = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const token = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const id = await ctx.db.insert("tenantFormShare", {
      tenantId: args.tenantId,
      token,
      createdAt: now,
    });
    return { token, shareId: id };
  },
});

/** Enlace actual (sin usar) para este tenant, si existe */
export const getCurrentShare = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenantFormShare")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .filter((q) => q.eq(q.field("usedAt"), undefined))
      .first();
  },
});

/** Para la página pública: obtiene config + si el token sigue válido (no usado) */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("tenantFormShare")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!share) return null;
    if (share.usedAt != null)
      return { status: "used" as const, config: null, tenantName: null };
    const config = await ctx.db
      .query("tenantFormConfig")
      .withIndex("by_tenant", (q) => q.eq("tenantId", share.tenantId))
      .first();
    const tenant = await ctx.db.get(share.tenantId);
    return {
      status: "valid" as const,
      config: config
        ? {
            title: config.title,
            fields: config.fields,
            includeColorTheme: config.includeColorTheme ?? false,
          }
        : null,
      tenantName: tenant?.name ?? null,
    };
  },
});

/** Envío desde la página pública (una sola vez por token) */
export const submitByToken = mutation({
  args: {
    token: v.string(),
    responses: v.string(), // JSON
  },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("tenantFormShare")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!share) throw new Error("Enlace no válido");
    if (share.usedAt != null) throw new Error("Este formulario ya fue enviado");
    const now = Date.now();
    await ctx.db.insert("formSubmissions", {
      tenantId: share.tenantId,
      token: args.token,
      responses: args.responses,
      createdAt: now,
    });
    await ctx.db.patch(share._id, { usedAt: now });
    return { ok: true };
  },
});

// --- Respuestas guardadas (para tab Formulario y generar prompt) ---

export const getLastSubmission = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("formSubmissions")
      .withIndex("by_tenant_created", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .first();
  },
});

export const listSubmissions = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("formSubmissions")
      .withIndex("by_tenant_created", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(20);
  },
});
