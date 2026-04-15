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

/** Estadísticas para el Centro de Aprendizaje: documentos y última actualización. */
export const getStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("knowledgeItems")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
    const lastUpdatedAt =
      items.length > 0 ? Math.max(...items.map((i) => i.updatedAt)) : null;
    return {
      documentCount: items.length,
      lastUpdatedAt,
    };
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

/** Indexa un knowledgeItem en RAG para que el bot pueda buscarlo.
 *  Si OpenClaw es el único modelo (sin OPENAI_API_KEY válida), se omite
 *  la indexación con embeddings — el conocimiento se carga como texto plano. */
export const indexInRag = internalAction({
  args: { id: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.knowledge.getForRag, { id: args.id });
    if (!item) return;

    // Si el item viene de archivo, extraer texto y guardarlo en `content`
    // para que la carga directa (OpenClaw-only) funcione sin depender de fetchFileContent en runtime.
    let extractedText = "";
    if (item.storageId) {
      extractedText = await ctx.runAction(internal.knowledgeFileParsing.fetchFileContent, {
        storageId: item.storageId,
      });
      if (extractedText && !item.content?.trim()) {
        await ctx.runMutation(internal.knowledge.patchContent, {
          id: args.id,
          content: extractedText,
        });
        console.log("knowledge: content extraído y guardado desde archivo", {
          id: args.id,
          title: item.title,
          chars: extractedText.length,
        });
      }
    }

    const openclawOnly = Boolean(process.env.OPENCLAW_AUTH_TOKEN);
    if (openclawOnly) {
      console.log("knowledge: embeddings omitidos (modo OpenClaw-only)", { id: args.id });
      return;
    }

    const text = item.storageId
      ? `${item.title}\n\n${extractedText || "(archivo vacío o no soportado)"}`
      : `${item.title}\n\n${item.content}`;
    const key = `knowledge_${args.id}`;

    if (item.ragEntryId) {
      try {
        await rag.deleteAsync(ctx, { entryId: item.ragEntryId as EntryId });
      } catch {
        // Ignorar si ya no existe
      }
    }

    try {
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
    } catch (err) {
      console.warn("knowledge: rag.add falló (embeddings)", err instanceof Error ? err.message : err);
    }
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

/** Re-extrae texto de todos los items con storageId y content vacío.
 *  Ejecutar una vez desde el dashboard de Convex para migrar items existentes. */
export const backfillFileContent = internalAction({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.runQuery(internal.knowledge.listAllWithEmptyContent, {});
    console.log("backfillFileContent: items pendientes", items.length);
    let filled = 0;
    for (const item of items) {
      if (!item.storageId) continue;
      try {
        const text = await ctx.runAction(internal.knowledgeFileParsing.fetchFileContent, {
          storageId: item.storageId,
        });
        if (text.trim()) {
          await ctx.runMutation(internal.knowledge.patchContent, {
            id: item._id,
            content: text,
          });
          filled++;
          console.log("backfillFileContent: ok", { title: item.title, chars: text.length });
        } else {
          console.warn("backfillFileContent: vacío", { title: item.title });
        }
      } catch (err) {
        console.warn("backfillFileContent: error", {
          title: item.title,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    console.log("backfillFileContent: completado", { total: items.length, filled });
  },
});

export const listAllWithEmptyContent = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("knowledgeItems").collect();
    return all.filter((i) => !i.content?.trim() && i.storageId);
  },
});

/** Guarda el texto extraído de un archivo en el campo content del knowledgeItem. */
export const patchContent = internalMutation({
  args: {
    id: v.id("knowledgeItems"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { content: args.content, updatedAt: Date.now() });
  },
});
