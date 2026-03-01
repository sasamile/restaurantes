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
import { setPriority } from "./ai/tools/setPriority";
import { search } from "./ai/tools/search";
import { createReservation } from "./ai/tools/createReservation";
import { createPQR } from "./ai/tools/createPQR";
import { createOrder } from "./ai/tools/createOrder";
import { updateOrder } from "./ai/tools/updateOrder";
import { cancelOrder } from "./ai/tools/cancelOrder";
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
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(
      v.union(
        v.literal("image"),
        v.literal("video"),
        v.literal("audio"),
        v.literal("document")
      )
    ),
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
        mediaUrl: args.mediaUrl,
        mediaType: args.mediaType,
      });

      const conversation = await ctx.runQuery(
        internal.system.conversations.getByThreadId,
        { threadId }
      );

      if (!conversation) {
        console.error("YCloud: conversación no encontrada después de getOrCreate");
        return;
      }

      // assignedTo null/undefined = Bot activo; assignedTo set = Agente humano (bot no responde)
      const isBotMode = !conversation.assignedTo;

      // Si la conversación estaba cerrada y el cliente volvió a escribir -> reabrir para que el bot responda
      if (conversation.status === "closed" && isBotMode) {
        await ctx.runMutation(internal.system.conversations.reopen, {
          threadId,
        });
      }

      // Bot responde: open, o closed (acabamos de reabrir). No responde si pending (necesita humano)
      const shouldTriggerAgent =
        (conversation.status === "open" || conversation.status === "closed") &&
        isBotMode;

      if (shouldTriggerAgent) {
        const tenantPrompt = await ctx.runQuery(api.prompts.getDefault, {
          tenantId: args.tenantId,
        });
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const timeHint = now.toTimeString().slice(0, 5);
        const dateTimeContext = `[Fecha y hora actual para interpretar "hoy" o "mañana": ${today}, aprox. ${timeHint}. Usa esta fecha cuando el cliente diga "hoy" o "para hoy.]\n\n`;
        const promptWithContext =
          dateTimeContext +
          (tenantPrompt?.prompt?.trim()
            ? `[Contexto del restaurante - prioriza esto:]\n${tenantPrompt.prompt}\n\n[Cliente dice:]\n${args.text}`
            : `[Cliente dice:]\n${args.text}`);

        await supportAgent.generateText(ctx, { threadId }, {
          prompt: promptWithContext,
          tools: {
            searchTool: search,
            createReservationTool: createReservation,
            createOrderTool: createOrder,
            updateOrderTool: updateOrder,
            cancelOrderTool: cancelOrder,
            createPQRTool: createPQR,
            escalateConversationTool: escalateConversation,
            setPriorityTool: setPriority,
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

/** Envía un mensaje de texto por WhatsApp a un número (sin conversación). Usado p. ej. para notificar pedido despachado. */
export const sendWhatsAppToPhone = internalAction({
  args: {
    tenantId: v.id("tenants"),
    phoneNumber: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.runQuery(api.integrations.getYCloudForSend, {
      tenantId: args.tenantId,
    });
    if (!integration) {
      console.warn("notifyOrderDispatched: YCloud no configurado para tenant");
      return;
    }
    const toRaw = args.phoneNumber.replace(/^whatsapp:/, "").trim().replace(/\s/g, "");
    const to = toRaw.startsWith("+") ? toRaw : `+${toRaw}`;
    const fromRaw = integration.phoneNumber.trim().replace(/\s/g, "");
    const from = fromRaw.startsWith("+") ? fromRaw : `+${fromRaw}`;
    const res = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": integration.apiKey,
      },
      body: JSON.stringify({
        from,
        to,
        type: "text",
        text: { body: args.content.trim() },
      }),
    });
    const data = (await res.json()) as { id?: string; status?: string; message?: string };
    if (!res.ok) {
      console.error("YCloud sendWhatsAppToPhone:", data.message ?? data.status ?? res.statusText);
    }
  },
});
