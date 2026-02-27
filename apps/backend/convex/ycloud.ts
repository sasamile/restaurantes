import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/** Inserta saltos de línea para legibilidad cuando el LLM responde todo junto. */
function formatForWhatsApp(text: string): string {
  let out = text.trim();
  out = out.replace(/\s+(https?:\/\/[^\s]+)/g, "\n\n$1");
  out = out.replace(/\s+¿/g, "\n\n¿");
  out = out.replace(/([.!?])\s+([A-Z¡])/g, "$1\n\n$2");
  return out.trim();
}

/**
 * Envía un mensaje de texto a WhatsApp vía API de YCloud y lo guarda en nuestra DB.
 * Requiere API Key y número de negocio configurados en Integraciones.
 */
export const sendWhatsAppMessage = action({
  args: {
    tenantId: v.id("tenants"),
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const contentTrimmed = formatForWhatsApp(args.content);
    if (!contentTrimmed) throw new Error("El mensaje no puede estar vacío");

    const integration = await ctx.runQuery(
      api.integrations.getYCloudForSend,
      { tenantId: args.tenantId }
    );
    if (!integration) {
      throw new Error(
        "Falta configurar API Key y número de negocio en Integraciones"
      );
    }

    const conversation = await ctx.runQuery(
      api.conversations.get,
      { conversationId: args.conversationId }
    );
    if (!conversation || conversation.tenantId !== args.tenantId) {
      throw new Error("Conversación no encontrada");
    }

    const toRaw = conversation.externalContactId
      .replace(/^whatsapp:/, "")
      .trim()
      .replace(/\s/g, "");
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
        text: { body: contentTrimmed },
      }),
    });

    const data = (await res.json()) as { id?: string; status?: string; message?: string };
    if (!res.ok) {
      const errMsg = data.message ?? data.status ?? res.statusText;
      throw new Error(`Error YCloud: ${errMsg}`);
    }

    await ctx.runMutation(api.messages.add, {
      conversationId: args.conversationId,
      tenantId: args.tenantId,
      direction: "OUTBOUND",
      content: contentTrimmed,
      providerMessageId: data.id,
    });

    return { ok: true, ycloudId: data.id };
  },
});
