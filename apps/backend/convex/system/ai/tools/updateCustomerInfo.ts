import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { api, internal } from "../../../_generated/api";

/**
 * Actualiza la información del cliente cuando este la comparte en el chat
 * (nombre completo, email, preferencias alimenticias, notas).
 * Usar cada vez que el cliente diga su nombre, correo, gustos, etc.
 */
export const updateCustomerInfo = createTool({
  description:
    "Guardar o actualizar información del cliente cuando él la comparte (nombre completo, email, preferencias como 'me gustan los tacos picantes', notas como edad o detalles). Usa INMEDIATAMENTE cuando el cliente diga su nombre, correo, gustos o cualquier dato personal. Después de guardar, responde amablemente y SIEMPRE continúa la conversación con una pregunta o sugerencia (pedido, reserva, menú); nunca dejes la conversación colgada.",
  args: jsonSchema<{
    name?: string;
    email?: string;
    notes?: string;
    preferences?: string;
  }>({
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Nombre completo del cliente (ej. Santiago Suescun Beltrán)",
      },
      email: {
        type: "string",
        description: "Correo electrónico del cliente",
      },
      notes: {
        type: "string",
        description: "Notas generales (edad, datos relevantes, etc.)",
      },
      preferences: {
        type: "string",
        description: "Preferencias alimenticias o de servicio (ej. tacos picantes, sin gluten, mesa junto a la ventana)",
      },
    },
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
    const externalContactId = conversation.externalContactId;

    const name = args.name?.trim();
    const email = args.email?.trim() || undefined;
    const notes = args.notes?.trim() || undefined;
    const preferences = args.preferences?.trim() || undefined;

    if (!name && !email && !notes && !preferences) {
      return "No hay información nueva para guardar.";
    }

    const customer = await ctx.runQuery(api.customers.getByTenantAndContact, {
      tenantId,
      externalContactId,
    });

    if (customer) {
      const updates: { name?: string; email?: string; notes?: string; preferences?: string } = {};
      if (name) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (notes !== undefined) updates.notes = notes;
      if (preferences !== undefined) updates.preferences = preferences;
      if (Object.keys(updates).length === 0) return "Información ya guardada.";

      await ctx.runMutation(api.customers.update, {
        id: customer._id,
        ...updates,
      });
      return "Información del cliente actualizada correctamente.";
    }

    await ctx.runMutation(api.customers.create, {
      tenantId,
      externalContactId,
      name: name || conversation.customerName || "Cliente",
      email,
      notes,
      preferences,
    });
    return "Información del cliente guardada correctamente.";
  },
});
