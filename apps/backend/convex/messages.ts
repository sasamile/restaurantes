import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: {
    conversationId: v.id("conversations"),
    tenantId: v.id("tenants"),
    direction: v.union(v.literal("INBOUND"), v.literal("OUTBOUND")),
    content: v.string(),
    providerMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      updatedAt: now,
    });
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: args.direction,
      type: "TEXT",
      content: args.content,
      providerMessageId: args.providerMessageId,
      createdAt: now,
    });
  },
});
