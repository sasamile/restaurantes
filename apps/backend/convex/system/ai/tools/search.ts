import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { internal } from "../../../_generated/api";
import rag from "../rag";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { SEARCH_INTERPRETER_PROMPT } from "../constants";

export const search = createTool({
  description:
    "Busca en la base de conocimiento del restaurante información sobre menú, precios, horarios, sedes, ubicación, domicilios, barrios y FAQs. Puedes llamarla varias veces con distintas consultas si la primera no devuelve resultados.",
  args: jsonSchema<{ query: string }>({
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "La consulta para buscar. Para sedes usa términos como: 'sede [barrio]', 'sede [ciudad]', 'sedes domicilios', 'barrios sedes'. Prueba varias consultas si la primera no da resultados.",
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

    if (!searchResult.entries.length) {
      return `No se encontró información para "${args.query}" en la base de conocimiento. Intenta con otra consulta más amplia o diferente.`;
    }

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

    return response.text;
  },
});
