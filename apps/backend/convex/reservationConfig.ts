import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const reservationFieldValidator = v.object({
  key: v.string(),
  label: v.string(),
  required: v.boolean(),
  type: v.union(v.literal("text"), v.literal("number"), v.literal("select")),
  options: v.optional(v.array(v.string())),
});

export const get = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("reservationConfig")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
    return row ?? null;
  },
});

export const getOrDefault = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("reservationConfig")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();
    if (row) return row;
    return {
      maxReservationsPerDay: 20,
      maxVirtualPerDay: 10,
      maxPresencialPerDay: 15,
      reservationFields: [
        { key: "customerName", label: "Nombre", required: true, type: "text" as const },
        { key: "customerPhone", label: "Teléfono", required: true, type: "text" as const },
        { key: "tableNumber", label: "Mesa preferida", required: false, type: "text" as const },
        { key: "customerEmail", label: "Email", required: false, type: "text" as const },
      ],
      defaultDurationMinutes: 120,
      updatedAt: Date.now(),
    };
  },
});

export const save = mutation({
  args: {
    tenantId: v.id("tenants"),
    maxReservationsPerDay: v.optional(v.number()),
    maxVirtualPerDay: v.optional(v.number()),
    maxPresencialPerDay: v.optional(v.number()),
    reservationFields: v.optional(
      v.array(reservationFieldValidator)
    ),
    defaultDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("reservationConfig")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();

    const payload = {
      maxReservationsPerDay: args.maxReservationsPerDay ?? existing?.maxReservationsPerDay ?? 20,
      maxVirtualPerDay: args.maxVirtualPerDay ?? existing?.maxVirtualPerDay ?? 10,
      maxPresencialPerDay: args.maxPresencialPerDay ?? existing?.maxPresencialPerDay ?? 15,
      reservationFields:
        args.reservationFields ?? existing?.reservationFields ?? [
          { key: "customerName", label: "Nombre", required: true, type: "text" as const },
          { key: "customerPhone", label: "Teléfono", required: true, type: "text" as const },
          { key: "tableNumber", label: "Mesa preferida", required: false, type: "text" as const },
        ],
      defaultDurationMinutes: args.defaultDurationMinutes ?? existing?.defaultDurationMinutes ?? 120,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("reservationConfig", {
      tenantId: args.tenantId,
      ...payload,
    });
  },
});
