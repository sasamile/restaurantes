import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const channelValidator = v.union(
  v.literal("whatsapp"),
  v.literal("messenger"),
  v.literal("webchat")
);
const statusValidator = v.union(
  v.literal("open"),
  v.literal("closed"),
  v.literal("pending")
);

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_tenant_last_message", (q) => q.eq("tenantId", args.tenantId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const getOrCreate = mutation({
  args: {
    tenantId: v.id("tenants"),
    externalContactId: v.string(),
    customerName: v.string(),
    channel: channelValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_tenant_contact", (q) =>
        q.eq("tenantId", args.tenantId).eq("externalContactId", args.externalContactId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastMessageAt: now,
        updatedAt: now,
        customerName: args.customerName,
      });
      return existing._id;
    }

    return await ctx.db.insert("conversations", {
      tenantId: args.tenantId,
      externalContactId: args.externalContactId,
      customerName: args.customerName,
      channel: args.channel,
      status: "open",
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.conversationId, { status: args.status, updatedAt: now });
    return args.conversationId;
  },
});
