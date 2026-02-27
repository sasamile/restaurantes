import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Webhook que recibe YCloud (WhatsApp, etc.) por tenant.
 * URL: POST https://<tu-backend>.convex.site/webhooks/ycloud/<tenantId>
 *
 * Soporta el payload real de YCloud (whatsapp.inbound_message.received):
 * - whatsappInboundMessage.from → contactId
 * - whatsappInboundMessage.customerProfile.name → nombre del cliente
 * - whatsappInboundMessage.text.body / image.caption / etc. → contenido
 *
 * También acepta formato simplificado para testing:
 * { contactId, customerName, channel, text }
 */
const webhookYCloud = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // pathPrefix /webhooks/ycloud/ → pathParts = ["webhooks", "ycloud", "<tenantId>"]
  const tenantId = pathParts[2] as Id<"tenants"> | undefined;
  if (!tenantId || tenantId === "ycloud") {
    return new Response(JSON.stringify({ error: "tenantId required in path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tenant = await ctx.runQuery(api.tenants.get, { tenantId });
  if (!tenant) {
    return new Response(JSON.stringify({ error: "Tenant not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Solo procesar mensajes entrantes de WhatsApp; ignorar otros eventos
  const eventType = (body as { type?: string })?.type;
  if (
    eventType &&
    eventType !== "whatsapp.inbound_message.received"
  ) {
    return new Response(
      JSON.stringify({ ok: true, skipped: "event type not processed" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Payload real de YCloud (whatsapp.inbound_message.received)
  const wim = (body as { whatsappInboundMessage?: unknown })
    ?.whatsappInboundMessage as
    | {
        from?: string;
        customerProfile?: { name?: string };
        type?: string;
        text?: { body?: string };
        image?: { caption?: string };
        video?: { caption?: string };
        audio?: unknown;
        document?: { filename?: string };
        location?: unknown;
      }
    | undefined;

  let contactId: string;
  let customerName: string;
  let channel: "whatsapp" | "messenger" | "webchat";
  let text: string;

  if (wim) {
    const from = (wim.from ?? "").trim();
    if (!from) {
      return new Response(
        JSON.stringify({ error: "Missing from in whatsappInboundMessage" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    contactId = from.startsWith("whatsapp:")
      ? from
      : `whatsapp:${from.startsWith("+") ? from : `+${from}`}`;
    customerName =
      wim.customerProfile?.name?.trim() ||
      from.replace(/^whatsapp:/, "").replace(/^\+/, "") ||
      "Cliente";
    channel = "whatsapp";
    if (wim.type === "text" && wim.text?.body) {
      text = wim.text.body;
    } else if (wim.type === "image" && wim.image?.caption) {
      text = `[Imagen] ${wim.image.caption}`;
    } else if (wim.type === "video" && wim.video?.caption) {
      text = `[Video] ${wim.video.caption}`;
    } else if (wim.type === "audio") {
      text = "[Audio]";
    } else if (wim.type === "document" && wim.document?.filename) {
      text = `[Documento] ${wim.document.filename}`;
    } else if (wim.type === "location") {
      text = "[Ubicación]";
    } else {
      text = wim.type ? `[${wim.type}]` : "";
    }
  } else {
    // Formato simplificado (testing / compatibilidad)
    const simple = body as {
      contactId?: string;
      customerName?: string;
      channel?: "whatsapp" | "messenger" | "webchat";
      text?: string;
    };
    const rawContact = simple.contactId ?? "";
    contactId = rawContact.startsWith("whatsapp:")
      ? rawContact
      : rawContact
        ? `whatsapp:${rawContact.startsWith("+") ? rawContact : `+${rawContact}`}`
        : "unknown";
    customerName = simple.customerName?.trim() ?? "Cliente";
    channel = simple.channel ?? "whatsapp";
    text = simple.text ?? "";
  }

  // Rechazar si no hay contactId válido (evita duplicados "Cliente" / "unknown")
  if (
    !contactId ||
    contactId === "unknown" ||
    contactId === "whatsapp:+unknown" ||
    contactId.includes("unknown")
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing contactId/from" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  await ctx.runMutation(api.integrations.markYCloudConnected, { tenantId });

  const eventId =
    (body as { id?: string })?.id ?? `evt_${Date.now()}_${contactId}`;

  await ctx.runAction(internal.system.ycloud.processInboundMessage, {
    tenantId,
    eventId,
    contactId,
    customerName,
    channel,
    text,
  });

  return new Response(JSON.stringify({ ok: true, received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

const http = httpRouter();

http.route({
  pathPrefix: "/webhooks/ycloud/",
  method: "POST",
  handler: webhookYCloud,
});

export default http;
