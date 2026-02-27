import type { EntryId } from "@convex-dev/rag";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import rag from "./system/ai/rag";

export const listByTenant = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knowledgeItems")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("knowledgeItems", {
      tenantId: args.tenantId,
      title: args.title,
      content: args.content,
      tags: args.tags,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.knowledge.indexInRag, { id });
    return id;
  },
});

/** Crea un knowledge item desde un archivo subido (txt, md, csv). */
export const createFromFile = mutation({
  args: {
    tenantId: v.id("tenants"),
    storageId: v.id("_storage"),
    title: v.string(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("knowledgeItems", {
      tenantId: args.tenantId,
      title: args.title,
      content: "", // se extrae en indexInRag desde el archivo
      storageId: args.storageId,
      tags: args.tags,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.knowledge.indexInRag, { id });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("knowledgeItems"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { id, ...patch } = args;
    await ctx.db.patch(id, { ...patch, updatedAt: now });
    await ctx.scheduler.runAfter(0, internal.knowledge.indexInRag, { id });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (item?.ragEntryId) {
      await ctx.scheduler.runAfter(0, internal.knowledge.removeFromRag, {
        entryId: item.ragEntryId,
      });
    }
    await ctx.db.delete(args.id);
    return args.id;
  },
});

/** Indexa un knowledgeItem en RAG para que el bot pueda buscarlo. */
export const indexInRag = internalAction({
  args: { id: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.knowledge.getForRag, { id: args.id });
    if (!item) return;

    let text: string;
    if (item.storageId) {
      const content = await ctx.runAction(internal.knowledgeFileParsing.fetchFileContent, {
        storageId: item.storageId,
      });
      text = `${item.title}\n\n${content || "(archivo vacío o no soportado)"}`;
    } else {
      text = `${item.title}\n\n${item.content}`;
    }
    const key = `knowledge_${args.id}`;

    if (item.ragEntryId) {
      try {
        await rag.deleteAsync(ctx, { entryId: item.ragEntryId as EntryId });
      } catch {
        // Ignorar si ya no existe
      }
    }

    const { entryId } = await rag.add(ctx, {
      namespace: item.tenantId,
      text,
      key,
      title: item.title,
      metadata: { source: "knowledgeItems", id: args.id },
    });

    await ctx.runMutation(internal.knowledge.setRagEntryId, {
      id: args.id,
      ragEntryId: entryId,
    });
  },
});

/** Elimina un ítem del índice RAG. */
export const removeFromRag = internalAction({
  args: { entryId: v.string() },
  handler: async (ctx, args) => {
    try {
      await rag.deleteAsync(ctx, { entryId: args.entryId as EntryId });
    } catch {
      // Ignorar si ya no existe
    }
  },
});

export const getForRag = internalQuery({
  args: { id: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const setRagEntryId = internalMutation({
  args: {
    id: v.id("knowledgeItems"),
    ragEntryId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { ragEntryId: args.ragEntryId });
  },
});
