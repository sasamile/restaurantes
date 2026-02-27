import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tenants").order("desc").collect();
  },
});

export const listWithPlans = query({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").order("desc").collect();
    return Promise.all(
      tenants.map(async (t) => {
        const plan = t.planId ? await ctx.db.get(t.planId) : null;
        return { ...t, planName: plan?.name ?? null };
      })
    );
  },
});

export const get = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tenantId);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("trial"),
      v.literal("cancelled")
    ),
    planId: v.optional(v.id("plans")),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("Ya existe un restaurante con ese slug");
    return await ctx.db.insert("tenants", {
      name: args.name,
      slug: args.slug,
      status: args.status,
      planId: args.planId,
      primaryColor: args.primaryColor,
      secondaryColor: args.secondaryColor,
      address: args.address,
      phone: args.phone,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("trial"),
        v.literal("cancelled")
      )
    ),
    planId: v.optional(v.id("plans")),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (filtered.slug) {
      const existing = await ctx.db
        .query("tenants")
        .withIndex("by_slug", (q) => q.eq("slug", filtered.slug as string))
        .first();
      if (existing && existing._id !== tenantId)
        throw new Error("Ya existe un restaurante con ese slug");
    }
    await ctx.db.patch(tenantId, filtered);
    return tenantId;
  },
});

export const remove = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    // Eliminar memberships, integraciones, etc. asociados
    const memberships = await ctx.db
      .query("userTenants")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    for (const m of memberships) await ctx.db.delete(m._id);

    const integrations = await ctx.db
      .query("tenantIntegrations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    for (const i of integrations) await ctx.db.delete(i._id);

    await ctx.db.delete(args.tenantId);
    return args.tenantId;
  },
});

export const updateStatus = mutation({
  args: {
    tenantId: v.id("tenants"),
    status: v.union(
      v.literal("active"),
      v.literal("trial"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tenantId, { status: args.status });
    return args.tenantId;
  },
});

/**
 * Crea datos de demo: 1 usuario superadmin, 2 restaurantes, membresías e integración YCloud.
 * Ejecutar una vez desde el dashboard de Convex (Functions → tenants.seedDemo → Run).
 */
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      name: "Superadmin Demo",
      email: "superadmin@demo.com",
      isSuperadmin: true,
      createdAt: now,
    });

    const t1 = await ctx.db.insert("tenants", {
      name: "Restaurante La Parrilla",
      slug: "la-parrilla",
      status: "active",
      createdAt: now,
    });
    const t2 = await ctx.db.insert("tenants", {
      name: "Pizzería Napoli",
      slug: "pizzeria-napoli",
      status: "trial",
      createdAt: now,
    });

    await ctx.db.insert("userTenants", {
      userId,
      tenantId: t1,
      role: "OWNER",
      createdAt: now,
    });
    await ctx.db.insert("userTenants", {
      userId,
      tenantId: t2,
      role: "OWNER",
      createdAt: now,
    });

    await ctx.db.insert("tenantIntegrations", {
      tenantId: t1,
      provider: "YCLOUD",
      webhookPath: `tenant_${t1}_${now.toString(36)}`,
      connected: true,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("tenantIntegrations", {
      tenantId: t2,
      provider: "YCLOUD",
      webhookPath: `tenant_${t2}_${now.toString(36)}`,
      connected: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("knowledgeItems", {
      tenantId: t1,
      title: "Horario de atención",
      content:
        "Lunes a viernes de 12:00 a 22:00. Sábados y domingos de 13:00 a 23:00.",
      tags: ["horarios"],
      updatedAt: now,
    });
    await ctx.db.insert("tenantPrompts", {
      tenantId: t1,
      name: "Prompt base restaurante",
      prompt:
        "Eres el asistente virtual del restaurante La Parrilla. Respondes en tono cercano y profesional. Prioriza reservas y resolución de dudas frecuentes sobre horario, menú y ubicación.",
      isDefault: true,
      updatedAt: now,
    });

    return { userId, tenants: [t1, t2] };
  },
});
