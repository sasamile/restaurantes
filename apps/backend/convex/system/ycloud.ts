import { v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import { supportAgent } from "./ai/agents/supportAgent";
import { saveMessage } from "@convex-dev/agent";
import { components } from "../_generated/api";
import {
  escalateConversation,
  resolveConversation,
} from "./ai/tools/resolveConversation";
import { search } from "./ai/tools/search";
import type { PaginationResult } from "convex/server";
import type { MessageDoc } from "@convex-dev/agent";
import { Id } from "../_generated/dataModel";

/** Deduplicación: evita procesar el mismo webhook dos veces */
export const recordProcessedEvent = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ycloudProcessedEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .first();
    if (existing) return { duplicate: true };
    await ctx.db.insert("ycloudProcessedEvents", { eventId: args.eventId });
    return { duplicate: false };
  },
});

/**
 * Procesa mensaje entrante de WhatsApp: guarda mensaje, ejecuta agente RAG
 * y envía la respuesta automáticamente por YCloud.
 */
export const processInboundMessage = internalAction({
  args: {
    tenantId: v.id("tenants"),
    eventId: v.string(),
    contactId: v.string(),
    customerName: v.string(),
    channel: v.union(
      v.literal("whatsapp"),
      v.literal("messenger"),
      v.literal("webchat")
    ),
    text: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      const dedupe = await ctx.runMutation(
        internal.system.ycloud.recordProcessedEvent,
        { eventId: args.eventId }
      );
      if (dedupe.duplicate) {
        console.log("YCloud: evento ya procesado (duplicado)", args.eventId);
        return;
      }

      const { conversationId, threadId } = await ctx.runMutation(
        internal.system.conversations.getOrCreateForAgent,
        {
          tenantId: args.tenantId,
          externalContactId: args.contactId,
          customerName: args.customerName,
          channel: args.channel,
        }
      );

      await ctx.runMutation(api.messages.add, {
        conversationId,
        tenantId: args.tenantId,
        direction: "INBOUND",
        content: args.text,
      });

      const conversation = await ctx.runQuery(
        internal.system.conversations.getByThreadId,
        { threadId }
      );

      if (!conversation) {
        console.error("YCloud: conversación no encontrada después de getOrCreate");
        return;
      }

      const shouldTriggerAgent = conversation.status === "open";

      if (shouldTriggerAgent) {
        const tenantPrompt = await ctx.runQuery(api.prompts.getDefault, {
          tenantId: args.tenantId,
        });
        const promptWithContext =
          tenantPrompt?.prompt?.trim()
            ? `[Contexto del restaurante - prioriza esto:]\n${tenantPrompt.prompt}\n\n[Cliente dice:]\n${args.text}`
            : args.text;

        await supportAgent.generateText(ctx, { threadId }, {
          prompt: promptWithContext,
          tools: {
            searchTool: search,
            escalateConversationTool: escalateConversation,
            resolveConversationTool: resolveConversation,
          },
        });

        if (args.channel === "whatsapp") {
          await new Promise((r) => setTimeout(r, 1000));

          const messagesAfter: PaginationResult<MessageDoc> =
            await supportAgent.listMessages(ctx, {
              threadId,
              paginationOpts: { numItems: 10, cursor: null },
            });

          const lastAssistantMessage = messagesAfter.page.find(
            (msg) => msg.message?.role === "assistant"
          );

          if (lastAssistantMessage?.message) {
            const messageContent = lastAssistantMessage.message.content;
            const messageText: string =
              typeof messageContent === "string"
                ? messageContent
                : Array.isArray(messageContent)
                  ? (messageContent as { type: string; text?: string }[])
                      .map((part) =>
                        part.type === "text" ? part.text ?? "" : ""
                      )
                      .join("")
                  : String(messageContent);

            if (messageText.trim()) {
              await ctx.runAction(api.ycloud.sendWhatsAppMessage, {
                tenantId: args.tenantId,
                conversationId,
                content: messageText,
              });
            }
          }
        }
      } else {
        await saveMessage(ctx, components.agent, {
          threadId,
          prompt: args.text,
        });
      }

      await ctx.runMutation(internal.system.conversations.updateLastMessageAt, {
        threadId,
      });
    } catch (err) {
      console.error("YCloud processInboundMessage ERROR", {
        eventId: args.eventId,
        tenantId: args.tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});
