import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { internal } from "../../../_generated/api";
import rag from "../rag";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { supportAgent } from "../agents/supportAgent";
import { SEARCH_INTERPRETER_PROMPT } from "../constants";

export const search = createTool({
  description:
    "Busca en la base de conocimiento del restaurante información sobre menú, precios, horarios, ubicación y FAQs",
  args: jsonSchema<{ query: string }>({
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "La consulta para buscar información relevante",
      },
    },
    required: ["query"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      return "Falta el ID del hilo";
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId }
    );

    if (!conversation) {
      return "Conversación no encontrada";
    }

    const tenantId = conversation.tenantId as string;

    const searchResult = await rag.search(ctx, {
      namespace: tenantId,
      query: args.query,
      limit: 5,
    });

    const contextText = `Resultados en ${searchResult.entries
      .map((e) => e.title || null)
      .filter((t) => t !== null)
      .join(", ")}. Contexto:\n\n${searchResult.text}`;

    const response = await generateText({
      messages: [
        { role: "system", content: SEARCH_INTERPRETER_PROMPT },
        {
          role: "user",
          content: `El cliente preguntó: ${args.query}\n\nBúsqueda: ${contextText}`,
        },
      ],
      model: openai.chat("gpt-4o-mini"),
    });

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: response.text,
      },
    });

    return response.text;
  },
});
