import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DAILY_CREDIT_LIMIT = 2000;

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/** Consume 1 crédito; lanza si se supera el límite diario (2000). */
export const useCredit = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const date = todayKey();
    const existing = await ctx.db
      .query("learningUsage")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).eq("date", date)
      )
      .unique();

    const nextCount = (existing?.count ?? 0) + 1;
    if (nextCount > DAILY_CREDIT_LIMIT) {
      throw new Error(
        `Límite diario alcanzado (${DAILY_CREDIT_LIMIT} créditos). Vuelve mañana.`
      );
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: nextCount });
      return nextCount;
    }
    await ctx.db.insert("learningUsage", {
      tenantId: args.tenantId,
      date,
      count: 1,
      highConfidenceCount: 0,
    });
    return 1;
  },
});

/** Registra si la última respuesta fue de alta confianza (para métricas). */
export const recordConfidence = mutation({
  args: {
    tenantId: v.id("tenants"),
    highConfidence: v.boolean(),
  },
  handler: async (ctx, args) => {
    const date = todayKey();
    const row = await ctx.db
      .query("learningUsage")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).eq("date", date)
      )
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, {
      highConfidenceCount: row.highConfidenceCount + (args.highConfidence ? 1 : 0),
    });
  },
});

/** Uso hoy para el tenant (preguntas realizadas). */
export const getUsageToday = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const date = todayKey();
    const row = await ctx.db
      .query("learningUsage")
      .withIndex("by_tenant_date", (q) =>
        q.eq("tenantId", args.tenantId).eq("date", date)
      )
      .unique();
    return {
      count: row?.count ?? 0,
      highConfidenceCount: row?.highConfidenceCount ?? 0,
      limit: DAILY_CREDIT_LIMIT,
    };
  },
});
