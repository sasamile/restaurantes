import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { api, internal } from "../../../_generated/api";

/**
 * Registra una PQR (Petición, Queja o Reclamo) desde el chat.
 * Usar cuando el cliente quiera hacer una petición, queja o reclamo y ya haya dado tipo, asunto y descripción.
 */
export const createPQR = createTool({
  description:
    "Registrar una PQR (Petición, Queja o Reclamo) formal. NO uses para cancelar pedidos; eso es cancelOrderTool. PQRs son para quejas/reclamos/peticiones (ej. pedido en mal estado, producto defectuoso). Requiere: tipo (petition/complaint/claim), nombre, asunto y descripción.",
  args: jsonSchema<{
    type: "petition" | "complaint" | "claim";
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    subject: string;
    description: string;
  }>({
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["petition", "complaint", "claim"],
        description: "Tipo: petition (petición), complaint (queja), claim (reclamo)",
      },
      customerName: { type: "string", description: "Nombre del cliente" },
      customerPhone: { type: "string", description: "Teléfono (opcional)" },
      customerEmail: { type: "string", description: "Email (opcional)" },
      subject: { type: "string", description: "Asunto o resumen de la PQR" },
      description: { type: "string", description: "Descripción detallada" },
    },
    required: ["type", "customerName", "subject", "description"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) return "Falta el ID del hilo.";

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      { threadId: ctx.threadId }
    );
    if (!conversation) return "Conversación no encontrada.";

    const tenantId = conversation.tenantId;
    const customerName = args.customerName.trim();
    const subject = args.subject.trim();
    const description = args.description.trim();
    if (!customerName || !subject || !description) {
      return "Faltan nombre, asunto o descripción. Pide al cliente que los indique.";
    }

    await ctx.runMutation(api.pqrs.create, {
      tenantId,
      type: args.type,
      customerName,
      customerPhone: args.customerPhone?.trim() || undefined,
      customerEmail: args.customerEmail?.trim() || undefined,
      subject,
      description,
      source: "whatsapp",
    });

    const typeLabel =
      args.type === "petition"
        ? "Petición"
        : args.type === "complaint"
          ? "Queja"
          : "Reclamo";
    const msg = `He registrado tu ${typeLabel} correctamente. El equipo del restaurante la revisará y te contactará si es necesario. Gracias por tu mensaje.`;

    try {
      await ctx.runAction(api.ycloud.sendWhatsAppMessage, {
        tenantId: conversation.tenantId,
        conversationId: conversation._id,
        content: msg,
      });
    } catch {
      // Si falla el envío, el return igual informa al agente
    }
    return msg;
  },
});
