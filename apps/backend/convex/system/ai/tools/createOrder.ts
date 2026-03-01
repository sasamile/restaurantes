import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { api, internal } from "../../../_generated/api";

/**
 * Crea un pedido desde el chat. El bot recoge producto(s), cantidad, cliente, dirección, etc.
 */
export const createOrder = createTool({
  description:
    "Crear un pedido. Úsala cuando tengas: al menos un producto con cantidad, nombre del cliente, teléfono (para notificar), dirección de entrega y quien recibe. Opcional: notas (ej. sin cebolla, sin picante, alergias).",
  args: jsonSchema<{
    items: { product: string; quantity: string; unit?: string }[];
    customerName: string;
    customerPhone?: string;
    address?: string;
    recipientName?: string;
    notes?: string;
  }>({
    type: "object",
    properties: {
      items: {
        type: "array",
        description: "Lista de productos: cada uno con product (nombre), quantity (cantidad), unit (opcional, ej. unidades, kg)",
        items: {
          type: "object",
          properties: {
            product: { type: "string", description: "Nombre del producto" },
            quantity: { type: "string", description: "Cantidad" },
            unit: { type: "string", description: "Unidad opcional (unidades, kg, latas...)" },
          },
          required: ["product", "quantity"],
        },
      },
      customerName: { type: "string", description: "Nombre del cliente" },
      customerPhone: { type: "string", description: "Teléfono para notificar cuando se despache" },
      address: { type: "string", description: "Dirección de entrega" },
      recipientName: { type: "string", description: "Nombre de quien recibe" },
      notes: { type: "string", description: "Observaciones (sin cebolla, sin picante, alergias, instrucciones especiales)" },
    },
    required: ["items", "customerName", "customerPhone", "address", "recipientName"],
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
    const conversationId = conversation._id;
    const validItems = args.items.filter((i) => (i.product ?? "").trim());
    if (validItems.length === 0) return "Indica al menos un producto con cantidad para el pedido.";

    const itemsJson = JSON.stringify(
      validItems.map((i) => ({
        product: String(i.product).trim(),
        quantity: String(i.quantity).trim() || "1",
        unit: (i.unit && String(i.unit).trim()) || undefined,
      }))
    );

    await ctx.runMutation(api.requests.create, {
      tenantId,
      distributorName: "WhatsApp / Inbox",
      items: itemsJson,
      customerName: args.customerName.trim(),
      customerPhone: args.customerPhone?.trim(),
      address: args.address?.trim(),
      recipientName: args.recipientName?.trim(),
      conversationId,
      notes: args.notes?.trim() || undefined,
    });

    return "Pedido registrado correctamente. Te avisaremos por aquí cuando esté despachado. ¿Algo más?";
  },
});
