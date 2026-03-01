import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const activityTypes = v.union(
  v.literal("arrival_confirmed"),
  v.literal("table_freed"),
  v.literal("reservation_created"),
  v.literal("no_show"),
  v.literal("table_reassigned")
);

export const listRecent = query({
  args: { tenantId: v.id("tenants"), limit: v.optional(v.number()) },
  handler: async (ctx, args) =>
    ctx.db
      .query("activityLog")
      .withIndex("by_tenant_created", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .take(args.limit ?? 20),
});

export const log = mutation({
  args: {
    tenantId: v.id("tenants"),
    type: activityTypes,
    message: v.string(),
    reservationId: v.optional(v.id("reservations")),
    tableNumber: v.optional(v.string()),
    customerName: v.optional(v.string()),
    data: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("activityLog", {
      tenantId: args.tenantId,
      type: args.type,
      message: args.message,
      reservationId: args.reservationId,
      tableNumber: args.tableNumber,
      customerName: args.customerName,
      data: args.data,
      createdAt: Date.now(),
    }),
});
