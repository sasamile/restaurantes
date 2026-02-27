import { jsonSchema } from "ai";
import { createTool } from "@convex-dev/agent";
import { internal } from "../../../_generated/api";
import { supportAgent } from "../agents/supportAgent";

export const escalateConversation = createTool({
  description: "Conectar al cliente con un agente humano del restaurante",
  args: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    additionalProperties: false,
  }),
  handler: async (ctx) => {
    if (!ctx.threadId) {
      return "Falta el ID del hilo";
    }

    await ctx.runMutation(internal.system.conversations.escalate, {
      threadId: ctx.threadId,
    });

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content:
          "He escalado tu consulta a un agente del restaurante. Te contactarán pronto. ¡Gracias por tu paciencia! 🚀",
      },
    });

    return "Conversación escalada";
  },
});

export const resolveConversation = createTool({
  description: "Marcar la conversación como resuelta",
  args: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    additionalProperties: false,
  }),
  handler: async (ctx) => {
    if (!ctx.threadId) {
      return "Falta el ID del hilo";
    }

    await ctx.runMutation(internal.system.conversations.resolve, {
      threadId: ctx.threadId,
    });

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content:
          "He marcado esta conversación como resuelta. Si necesitas algo más, estaremos aquí. ¡Que tengas un excelente día! ✨",
      },
    });

    return "Conversación resuelta";
  },
});
