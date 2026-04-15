import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  type ActionCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import rag from "./ai/rag";
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
import { cancelReservation } from "./ai/tools/cancelReservation";
import { updateReservation } from "./ai/tools/updateReservation";
import { createPQR } from "./ai/tools/createPQR";
import { searchVacancies } from "./ai/tools/searchVacancies";
import { createOrder } from "./ai/tools/createOrder";
import { updateOrder } from "./ai/tools/updateOrder";
import { cancelOrder } from "./ai/tools/cancelOrder";
import { updateCustomerInfo } from "./ai/tools/updateCustomerInfo";
import { sendPdf } from "./ai/tools/sendPdf";
import type { PaginationResult } from "convex/server";
import type { MessageDoc } from "@convex-dev/agent";
import { Id } from "../_generated/dataModel";
import {
  openClawMaxDialogHintChars,
  openClawMaxRagChars,
  openClawMaxTenantPromptChars,
  restaurantTurnWithOpenClaw,
  truncateForOpenClaw,
  truncateHeadTailForOpenClaw,
} from "./agent/openclawPlanner";
import {
  applyOpenClawSideEffect,
  getVacanciesMarkdownForOpenClaw,
} from "./agent/openclawSideEffects";

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

      // Reabrir si estaba cerrada, o si estaba "pending" sin humano asignado.
      // "pending" + sin humano asignado = punto muerto: el bot no responde y no hay humano.
      // En ese caso el bot retoma la conversación.
      const needsReopen =
        conversation.status === "closed" ||
        (conversation.status === "pending" && !conversation.assignedTo);
      if (needsReopen && isBotMode) {
        await ctx.runMutation(internal.system.conversations.reopen, {
          threadId,
        });
      }

      // Bot responde si: open, o si acabamos de reabrir (closed/pending-sin-humano)
      const shouldTriggerAgent =
        (conversation.status === "open" || needsReopen) && isBotMode;

      if (shouldTriggerAgent) {
        const tenant = await ctx.runQuery(api.tenants.get, {
          tenantId: args.tenantId,
        });
        const modules = tenant?.enabledModules ?? {};
        const hasReservas = modules.reservas !== false;
        const hasPedidos = modules.pedidos !== false;
        const hasPqr = modules.pqr !== false;
        const hasTrabajaConNosotros = modules.trabajaConNosotros !== false;

        const enabledList: string[] = [];
        if (hasReservas) enabledList.push("reservas");
        if (hasPedidos) enabledList.push("pedidos");
        if (hasPqr) enabledList.push("PQR (quejas/reclamos)");
        if (hasTrabajaConNosotros) enabledList.push("trabaja con nosotros");

        const modulesContext = enabledList.length > 0
          ? `[MÓDULOS HABILITADOS - OBLIGATORIO]
Este restaurante tiene habilitados estos módulos transaccionales: ${enabledList.join(", ")}. También puedes buscar en la base de conocimiento (menú, horarios, sedes, etc.).
NO uses herramientas de módulos que no estén habilitados (ej. no uses createOrderTool si pedidos no está habilitado). Sin embargo, SIEMPRE sigue las instrucciones del prompt del restaurante para flujos informativos (domicilios, preguntas frecuentes, etc.) aunque no sean un módulo habilitado.
${!hasReservas ? `- Si el cliente pide RESERVA y reservas NO está habilitado → responde: "Lo sentimos, este restaurante no ofrece reservas por WhatsApp. Te recomendamos contactar directamente al restaurante."` : "- Si el cliente quiere hacer una RESERVA y reservas está habilitado, puedes crearla usando createReservationTool cuando tengas los datos completos."}
${!hasPedidos ? `- PEDIDOS DIRECTOS: el módulo de pedidos NO está habilitado, por lo tanto NO puedes usar createOrderTool ni tomar pedidos directamente.\n- Sin embargo, si el cliente pregunta por DOMICILIOS, DELIVERY o quiere PEDIR algo, NO lo rechaces de inmediato. Sigue las instrucciones del prompt del restaurante (que puede tener un flujo de domicilios que recomienda sedes cercanas y redirige a Rappi u otro canal). Si el prompt del restaurante no tiene flujo de domicilios, entonces sí informa que no se toman pedidos por este canal y sugiere contactar al restaurante.` : "- Si el cliente quiere hacer un PEDIDO y pedidos está habilitado, toma el pedido normalmente y usa createOrderTool."}
${!hasPqr
    ? `- Si el cliente pide QUEJA/RECLAMO/PQR y PQR NO está habilitado → responde: "Lo sentimos, no podemos recibir quejas o reclamos por este canal. Te recomendamos contactar directamente al restaurante."`
    : "- Si el cliente quiere hacer una PQR (petición, queja o reclamo) y PQR está habilitado, SIEMPRE registra la PQR usando createPQRTool. NUNCA digas que no puedes recibir quejas o reclamos por este canal."}
${!hasTrabajaConNosotros
    ? `- Si el cliente pregunta por VACANTES/TRABAJO y trabaja con nosotros NO está habilitado → responde: "Lo sentimos, no tengo información de vacantes por este canal. Te recomendamos contactar directamente al restaurante."`
    : "- Si el cliente pregunta por vacantes o quiere trabajar: llama searchVacanciesTool y responde con correos/enlaces que devuelva la herramienta. No hay herramienta de postulación automática en el sistema."}

[Fin MÓDULOS HABILITADOS]\n\n`
          : "";

        const tenantPrompt = await ctx.runQuery(api.prompts.getDefault, {
          tenantId: args.tenantId,
        });

        // PDFs configurados del restaurante (para que el agente sepa qué puede enviar)
        const availablePdfs = await ctx.runQuery(api.pdfs.list, {
          tenantId: args.tenantId,
        });
        const pdfsContext =
          availablePdfs && availablePdfs.length > 0
            ? `[PDFs DISPONIBLES PARA ENVIAR]\nPuedes enviar los siguientes documentos usando sendPdfTool con el label exacto:\n${availablePdfs.map((p: { label: string }) => `- "${p.label}"`).join("\n")}\nREGLA PRIORITARIA:\n- Si el cliente pide menú, decoraciones, promociones o cualquier documento disponible, usa sendPdfTool.\n- Si existe un PDF que coincida con lo pedido, NO compartas enlaces externos (Drive, etc.). Envía el PDF configurado en este módulo.\n[Fin PDFs DISPONIBLES]\n\n`
            : "";
        const customer = await ctx.runQuery(api.customers.getByTenantAndContact, {
          tenantId: args.tenantId,
          externalContactId: args.contactId,
        });
        const customerContext =
          customer && (customer.notes || customer.email || customer.preferences)
            ? `[INFORMACIÓN DEL CLIENTE - usa esto para personalizar]
Nombre: ${customer.name}
${customer.email ? `Email: ${customer.email}` : ""}
${customer.notes ? `Notas: ${customer.notes}` : ""}
${customer.preferences ? `Preferencias: ${customer.preferences}` : ""}
[Fin INFORMACIÓN DEL CLIENTE]\n\n`
            : customer
              ? `[CLIENTE: ${customer.name}]\n\n`
              : "";

        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const timeHint = now.toTimeString().slice(0, 5);
        const dateTimeContext = `[Fecha y hora actual para interpretar "hoy" o "mañana": ${today}, aprox. ${timeHint}. Usa esta fecha cuando el cliente diga "hoy" o "para hoy.]\n\n`;
        // Transcripción de audio: solo si hay OPENAI_API_KEY disponible (Whisper).
        // Con OpenClaw como único modelo, se marca el audio para que OpenClaw lo maneje.
        let resolvedText = args.text;
        const openaiKey = process.env.OPENAI_API_KEY?.trim();
        // Si OpenClaw está activo, siempre usa carga directa de conocimiento.
        // La key de OpenAI puede existir (por Whisper u otros), pero para RAG/LLM
        // la prioridad es OpenClaw — no se intenta embeddings de OpenAI.
        const openclawOnly = Boolean(process.env.OPENCLAW_AUTH_TOKEN);
        if (args.mediaType === "audio" && args.mediaUrl) {
          if (openclawOnly) {
            // OpenClaw activo: no se usa Whisper (OpenAI). El audio llega sin transcripción.
            resolvedText = "[AUDIO SIN TRANSCRIPCIÓN]";
          } else if (openaiKey) {
            try {
              const audioRes = await fetch(args.mediaUrl);
              if (audioRes.ok) {
                const audioBuffer = await audioRes.arrayBuffer();
                const formData = new FormData();
                formData.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "audio.ogg");
                formData.append("model", "whisper-1");
                formData.append("language", "es");
                const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${openaiKey}` },
                  body: formData,
                });
                if (whisperRes.ok) {
                  const whisperData = (await whisperRes.json()) as { text?: string };
                  resolvedText = whisperData.text?.trim()
                    ? `[AUDIO TRANSCRITO: "${whisperData.text.trim()}"]`
                    : "[AUDIO SIN TRANSCRIPCIÓN]";
                } else {
                  resolvedText = "[AUDIO SIN TRANSCRIPCIÓN]";
                }
              } else {
                resolvedText = "[AUDIO SIN TRANSCRIPCIÓN]";
              }
            } catch (err) {
              console.warn("YCloud: transcripción de audio fallida", err);
              resolvedText = "[AUDIO SIN TRANSCRIPCIÓN]";
            }
          }
        }

        // Contexto de imagen para prompt
        const imageContext =
          args.mediaType === "image" && args.mediaUrl
            ? `[IMAGEN RECIBIDA - el cliente envió una foto]\n`
            : "";

        // Recuperar el último mensaje OUTBOUND real del bot.
        // Usamos nuestra propia tabla `messages` (guardada en sendWhatsAppMessage)
        // porque listMessages() pagina desde el más antiguo y en conversaciones
        // largas el último mensaje real queda fuera de la primera página.
        let lastAssistantText = "";
        let recentDialogHistory = "";
        try {
          const lastOutbound = await ctx.runQuery(
            internal.messages.getLastOutboundMessage,
            { conversationId }
          );
          if (lastOutbound) lastAssistantText = lastOutbound;
        } catch {
          // continúa sin contexto adicional
        }

        // Historial multi-turno: evita que el modelo pierda info dada
        // por el cliente en turnos anteriores (ej. descripción de queja en PQRS).
        try {
          const recentMsgs = await ctx.runQuery(
            internal.messages.getRecentMessages,
            { conversationId, limit: 20 }
          );
          if (recentMsgs && recentMsgs.length > 1) {
            const lines: string[] = [];
            for (const m of recentMsgs) {
              const role = m.direction === "INBOUND" ? "Cliente" : "Bot";
              const text = m.content.trim().slice(0, 500);
              if (text) lines.push(`${role}: ${text}`);
            }
            if (lines.length > 1) {
              recentDialogHistory =
                `[HISTORIAL RECIENTE DE LA CONVERSACIÓN — NO repitas preguntas si el cliente ya respondió]\n` +
                lines.join("\n") +
                `\n[Fin historial. El siguiente mensaje del cliente es el más reciente.]\n\n`;
            }
          }
        } catch {
          // continúa sin historial — el fallback es lastBotMessage
        }

        // Pre-interpretar respuestas numéricas (1-5) para eliminar ambigüedad.
        // Si el último mensaje del asistente presentó una lista de opciones numeradas,
        // reemplazamos el número por su texto correspondiente antes de enviarlo a la IA.
        // Ej: "2" + último mensaje tenía "2️⃣ Anónimo" → se convierte en "2 (Anónimo)"
        function resolveNumericResponse(
          userText: string,
          lastMsg: string
        ): string {
          const trimmed = userText.trim();
          if (!/^[1-9]$/.test(trimmed)) return userText;
          const num = parseInt(trimmed, 10);
          const EMOJI_NUMS = [
            "1️⃣",
            "2️⃣",
            "3️⃣",
            "4️⃣",
            "5️⃣",
            "6️⃣",
            "7️⃣",
            "8️⃣",
            "9️⃣",
          ];
          const targetEmoji = EMOJI_NUMS[num - 1] ?? "";
          for (const line of lastMsg.split("\n")) {
            const clean = line.trim();
            // Formato emoji: "2️⃣ Anónimo"
            if (targetEmoji && clean.startsWith(targetEmoji)) {
              const optText = clean.slice(targetEmoji.length).trim();
              if (optText) return `${trimmed} (${optText})`;
            }
            // Formato texto: "2. Texto" o "2) Texto"
            const dotMatch = clean.match(
              new RegExp(`^${num}[.)\\s]\\s*(.+)`)
            );
            if (dotMatch?.[1]?.trim()) {
              return `${trimmed} (${dotMatch[1].trim()})`;
            }
          }
          return userText;
        }

        const clientText = lastAssistantText
          ? resolveNumericResponse(resolvedText, lastAssistantText)
          : resolvedText;

        const lastQuestionContext = recentDialogHistory
          ? recentDialogHistory
          : lastAssistantText.trim()
            ? `[TU ÚLTIMO MENSAJE AL CLIENTE:]\n"${lastAssistantText.trim()}"\n[El cliente respondió a ese mensaje. Su intención ya está indicada en el texto anterior.]\n\n`
            : "";

        const isVisionMessage = args.mediaType === "image" && args.mediaUrl;

        // Pre-búsqueda RAG: inyecta contexto relevante directamente en el prompt.
        // Esto garantiza que el agente tenga la información del negocio sin depender
        // exclusivamente de que llame a searchTool con la query exacta correcta.
        // El agente usa esta información como fuente de verdad primaria.
        let preloadedRagContext = "";
        const isLocationQuery = /(sede|local|horario|direcci[oó]n|ubicaci[oó]n|domicilio|barrio|ciudad|centro\s*comercial|sucursal|d[oó]nde\s+(est[aá]|queda|encuentr)|cerca|cercan[ií]a|medell[ií]n|bogot[aá]|barranquilla|rionegro|villavicencio|urab[aá]|bello|envigado|itag[uü][ií]?|sabaneta|guayabal|poblado|laureles|mayorca|oviedo|tesoro|santaf[eé]|titan|unicentro|viva\s)/i.test(clientText);
        const isFoodQuery = /(men[uú]|precio|carta|plato|comida|comer|venden|tienen|ofrec|sirven|preparan|sopa|hamburguesa|carne|pollo|pescado|cerdo|ensalada|bebida|jugo|limonada|postre|entrada|acompa[ñn]|combo|bandeja|arroz|costilla|churrasco|solomito|infantil|vegeta|rappi|ifood|delivery|pedir\s|pedido)/i.test(clientText);
        const lastMsgAsksLocation = /(ciudad|barrio|sede.*cercan|direcci[oó]n|ubicaci[oó]n|indicar?\s.*ciudad)/i.test(lastAssistantText);
        const isTrivialMessage = /^(hola|ok|s[ií]|no|gracias|buenas?|buenos?\s*d[ií]as?|buenas?\s*tardes?|buenas?\s*noches?|[1-9]|listo|vale|claro|dale|perfecto|genial|exacto|así\s*es|correcto|entendido|chao|adios|adi[oó]s|bye)$/i.test(clientText.trim());
        const shouldPreloadRag = isLocationQuery || isFoodQuery || lastMsgAsksLocation || (!isTrivialMessage && clientText.trim().length > 8);

        /** Normaliza nombre de ciudad para queries RAG */
        function normalizeCityKey(raw: string): string {
          return raw.toUpperCase()
            .replace(/[ÍÌÎÏ]/g, "I").replace(/[ÁÀÂÄ]/g, "A")
            .replace(/[ÉÈÊË]/g, "E").replace(/[ÚÙÛÜ]/g, "U")
            .replace(/Ñ/g, "N");
        }

        const CITY_REGEX = /(medell[ií]n|bogot[aá]|barranquilla|rionegro|villavicencio|urab[aá]|bello|envigado|itag[uü][ií]?|sabaneta)/i;

        if (shouldPreloadRag) {
          // OpenClaw-only: cargar conocimiento directo desde Convex (sin embeddings OpenAI).
          // Cuando openaiKey exista, usar RAG semántico; si no, carga directa.
          if (openclawOnly) {
            try {
              const knowledgeItems = await ctx.runQuery(api.knowledge.listByTenant, {
                tenantId: args.tenantId,
              });
              console.log("ycloud: knowledge items encontrados", {
                tenantId: args.tenantId,
                count: knowledgeItems?.length ?? 0,
                titles: knowledgeItems?.map((i: { title?: string }) => i.title).slice(0, 10),
              });
              if (knowledgeItems && knowledgeItems.length > 0) {
                const MAX_CHARS = 48_000;
                let knowledgeText = "";

                // Priorizar docs de ubicaciones/sedes cuando el cliente pregunta por domicilios
                const prioritized = [...knowledgeItems].sort((a, b) => {
                  const score = (title?: string) => {
                    const t = (title ?? "").toLowerCase();
                    if (/(ubicaciones_completo|horarios_locales)/.test(t)) return 30;
                    if (/(ubicaciones|locales|sedes|horarios|domicilios|barrios)/.test(t)) return 10;
                    return 0;
                  };
                  if (isLocationQuery || lastMsgAsksLocation) return score(b.title) - score(a.title);
                  return 0;
                });

                for (const item of prioritized) {
                  let itemText = (item.content ?? "").trim();
                  const storageId = item.storageId;
                  const hasStorageId = Boolean(storageId);
                  if (!itemText && storageId) {
                    try {
                      itemText = await ctx.runAction(
                        internal.knowledgeFileParsing.fetchFileContent,
                        { storageId }
                      );
                    } catch (fetchErr) {
                      console.warn("ycloud: fetchFileContent falló para item", {
                        title: item.title,
                        error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
                      });
                      itemText = "";
                    }
                  }
                  console.log("ycloud: item procesado", {
                    title: item.title,
                    hasContent: Boolean(item.content?.trim()),
                    hasStorageId,
                    resolvedLen: itemText.length,
                  });
                  if (!itemText) continue;
                  const chunk = `### ${item.title}\n${itemText}\n\n`;
                  if ((knowledgeText + chunk).length > MAX_CHARS) break;
                  knowledgeText += chunk;
                }

                if (knowledgeText.trim()) {
                  preloadedRagContext =
                    `[BASE DE CONOCIMIENTO DEL RESTAURANTE — FUENTE DE VERDAD OBLIGATORIA]\n` +
                    `INSTRUCCIÓN: Los datos a continuación son los únicos válidos para responder sobre sedes, locales, horarios, direcciones, menú, platos y precios de ESTE restaurante. Busca en TODO el texto antes de decir que no tienes información.\n\n` +
                    knowledgeText +
                    `[Fin BASE DE CONOCIMIENTO]\n\n`;
                  console.log("ycloud: conocimiento cargado (modo OpenClaw-only)", {
                    items: prioritized.length,
                    chars: knowledgeText.length,
                  });
                } else {
                  console.warn("ycloud: todos los items quedaron vacíos — sin contexto RAG");
                }
              } else {
                console.warn("ycloud: sin items de conocimiento para este tenant", { tenantId: args.tenantId });
              }
            } catch (err) {
              console.warn("ycloud: carga de conocimiento falló", err instanceof Error ? err.message : err);
            }
          } else {
            // Modo con OpenAI: usar RAG semántico con embeddings
            try {
              const ragQuerySet = new Set<string>([clientText]);

              if (isLocationQuery || lastMsgAsksLocation) {
                const cityInClient = clientText.match(CITY_REGEX);
                const cityInLastMsg = lastAssistantText.match(CITY_REGEX);
                const cityMatch = cityInClient ?? cityInLastMsg;
                const barrioMatch = lastAssistantText.match(/barrio[:\s*]+([^\.\n,?]+)/i);
                const barrioHint = barrioMatch?.[1]?.trim() ?? "";

                if (cityMatch) {
                  const normalized = normalizeCityKey(cityMatch[1]);
                  ragQuerySet.add(`LOCALES ${normalized} horarios direcciones`);
                  ragQuerySet.add(`UBICACIONES ${normalized}`);
                  ragQuerySet.add(`${normalized} sedes locales direcciones domicilios`);
                  ragQuerySet.add(`ubicaciones_completo ${normalized}`);
                  if (barrioHint) ragQuerySet.add(`sede cercana ${normalized} barrio ${barrioHint} domicilio`);
                } else {
                  ragQuerySet.add("LOCALES horarios direcciones sedes");
                  ragQuerySet.add("ubicaciones barrios sedes locales");
                }
                ragQuerySet.add("ubicaciones_completo sedes ciudades domicilios");
              }

              if (isFoodQuery) {
                ragQuerySet.add("carta platos bebidas menú");
                ragQuerySet.add("combo hamburguesa carne pollo pescado");
                const cl = clientText.toLowerCase();
                if (/sopas?/.test(cl)) ragQuerySet.add("sancocho trifásico ajiaco santafereño cazuela paisa");
                if (/sancocho/.test(cl)) ragQuerySet.add("sancocho trifásico ajiaco cazuela");
                if (/parrill|asado/.test(cl)) ragQuerySet.add("churrasco baby beef punta de anca bife de chorizo");
                if (/t[ií]pic/.test(cl)) ragQuerySet.add("bandeja paisa calentado paisa arroz paisa sancocho");
                if (/entrada/.test(cl)) ragQuerySet.add("chorizo deditos mozarella chicharrón empanaditas");
                if (/vegetarian/.test(cl)) ragQuerySet.add("ensalada de la casa atún al carbón arepa de queso");
                if (/infantil|niño/.test(cl)) ragQuerySet.add("menú infantil nuggets pollo");
              }

              const seenIds = new Set<string>();
              const mergedEntries: { title?: string }[] = [];
              let mergedText = "";

              for (const q of ragQuerySet) {
                const result = await rag.search(ctx, { namespace: args.tenantId, query: q, limit: 12 });
                for (const entry of result.entries) {
                  const id = (entry as { _id?: string })._id ?? entry.title ?? Math.random().toString();
                  if (!seenIds.has(id)) { seenIds.add(id); mergedEntries.push(entry); }
                }
                if (result.entries.length > 0 && mergedText.split("\n").length < 600) {
                  mergedText += (mergedText ? "\n\n---\n\n" : "") + result.text;
                }
                if (mergedEntries.length >= 20) break;
              }

              if (mergedEntries.length > 0) {
                preloadedRagContext =
                  `[BASE DE CONOCIMIENTO DEL RESTAURANTE — FUENTE DE VERDAD OBLIGATORIA]\n` +
                  `INSTRUCCIÓN: Los datos a continuación son los únicos válidos para responder sobre sedes, locales, horarios, direcciones, menú, platos y precios de ESTE restaurante.\n\n` +
                  mergedText +
                  `\n[Fin BASE DE CONOCIMIENTO]\n\n`;
              }
            } catch (ragErr) {
              console.warn("ycloud: pre-búsqueda RAG falló", ragErr instanceof Error ? ragErr.message : ragErr);
            }
          }
        }

        // Ramal OpenClaw: pensamiento + respuesta en el gateway; sin OpenAI / supportAgent.
        const openclawEnabled = Boolean(process.env.OPENCLAW_AUTH_TOKEN);
        if (openclawEnabled && args.channel === "whatsapp") {
          const maxTenant = openClawMaxTenantPromptChars();
          const maxRag = openClawMaxRagChars();
          const maxDialog = openClawMaxDialogHintChars();
          const rawTenantPrompt = tenantPrompt?.prompt?.trim() ?? "";
          const tenantForGateway =
            rawTenantPrompt.length <= maxTenant
              ? rawTenantPrompt
              : truncateHeadTailForOpenClaw(rawTenantPrompt, maxTenant);
          const ragBundle = truncateForOpenClaw(preloadedRagContext, maxRag);
          const custOneLine = truncateForOpenClaw(
            (customer?.name ? `Nombre cliente: ${customer.name}. ` : "") +
              customerContext.replace(/\s+/g, " ").trim(),
            1200
          );
          const modulesLine = `Módulos: ${enabledList.length ? enabledList.join(", ") : "ninguno"}. Reservas=${hasReservas}, Pedidos=${hasPedidos}, PQR=${hasPqr}, Vacantes=${hasTrabajaConNosotros}.`;

          const pdfsLine =
            availablePdfs && availablePdfs.length > 0
              ? `PDFs (labels exactos): ${availablePdfs
                  .map((p: { label: string }) => p.label)
                  .join(", ")}`
              : "";

          const openClawBase = {
            clientMessage: clientText,
            restaurantName: tenant?.name ?? "Restaurante",
            tenantId: args.tenantId,
            modulesLine,
            tenantPromptExcerpt: tenantForGateway,
            ragKnowledgeExcerpt:
              ragBundle.trim() ||
              "(sin fragmentos RAG pre-cargados para este mensaje)",
            pdfsLine,
            dateTimeLine: `Fecha de referencia: ${today}, hora aproximada: ${timeHint}.`,
            customerLine: custOneLine.trim() || "Cliente sin ficha.",
            lastBotMessage: lastAssistantText.trim() || undefined,
            lastQuestionContext: truncateForOpenClaw(
              lastQuestionContext,
              maxDialog
            ),
            imageUrl: isVisionMessage ? args.mediaUrl : undefined,
            imageContextLine: imageContext,
          };

          let turn = await restaurantTurnWithOpenClaw(openClawBase);

          if (
            turn?.side_effect?.kind === "search_job_vacancies" &&
            hasTrabajaConNosotros
          ) {
            const cityArg =
              turn.side_effect.args?.cityFilter ?? turn.side_effect.args?.city;
            const cityFilter =
              typeof cityArg === "string" && cityArg.trim()
                ? cityArg.trim()
                : undefined;
            const vacMd = await getVacanciesMarkdownForOpenClaw(
              ctx as ActionCtx,
              args.tenantId,
              cityFilter
            );
            const turn2 = await restaurantTurnWithOpenClaw({
              ...openClawBase,
              vacancyLookupFromConvex: vacMd,
              vacancyRefinementPass: true,
            });
            if (turn2) {
              turn = turn2;
            } else {
              console.warn(
                "YCloud OpenClaw: refinado vacantes falló (sin turno 2); envío listado desde Convex"
              );
              turn = {
                assistant_message: vacMd.trim()
                  ? `Aquí está la información de vacantes que tenemos registrada:\n\n${vacMd.trim()}`
                  : (turn.assistant_message?.trim() ??
                    "No encontré vacantes para ese criterio. ¿Puedes indicar otra ciudad?"),
                side_effect: null,
              };
            }
          }

          if (turn) {
            let outbound = (turn.assistant_message ?? "").trim();
            const fx = await applyOpenClawSideEffect(
              ctx as ActionCtx,
              {
                threadId,
                tenantId: args.tenantId,
                conversationId,
                contactId: args.contactId,
                customerName: args.customerName,
                hasReservas,
              },
              turn.side_effect ?? null
            );
            if (!fx.ok && fx.errorMessage) {
              outbound = outbound
                ? `${outbound}\n\n⚠️ ${fx.errorMessage}`
                : fx.errorMessage;
            }
            const fxAny = fx as Record<string, unknown>;
            if (fxAny.pqrTicket && typeof fxAny.pqrTicket === "string") {
              const ticket = fxAny.pqrTicket as string;
              const label = (fxAny.pqrTypeLabel as string) ?? "PQR";
              if (!outbound.includes(ticket)) {
                outbound += `\n\n📋 Ticket #${ticket} (${label}) registrado exitosamente. El equipo del restaurante revisará tu caso. 🙏`;
              }
            }
            let toSend = outbound.trim();
            if (!toSend) {
              console.warn(
                "YCloud OpenClaw: assistant_message vacío tras procesar; usando fallback"
              );
              toSend =
                "No pude generar una respuesta ahora. ¿Puedes repetir tu mensaje o escribir al restaurante? 🙏";
            }
            try {
              await ctx.runAction(api.ycloud.sendWhatsAppMessage, {
                tenantId: args.tenantId,
                conversationId,
                content: toSend,
              });
            } catch (e) {
              console.error("YCloud OpenClaw: envío WhatsApp falló", {
                tenantId: args.tenantId,
                conversationId,
                len: toSend.length,
                preview: toSend.slice(0, 80),
                error: e instanceof Error ? e.message : String(e),
              });
            }
            try {
              await saveMessage(ctx, components.agent, {
                threadId,
                prompt: clientText,
              });
              await saveMessage(ctx, components.agent, {
                threadId,
                message: {
                  role: "assistant",
                  content: toSend,
                },
              });
            } catch (e) {
              console.warn("YCloud OpenClaw: saveMessage hilo", e);
            }
          } else {
            try {
              await ctx.runAction(api.ycloud.sendWhatsAppMessage, {
                tenantId: args.tenantId,
                conversationId,
                content:
                  "Lo sentimos, el asistente no está disponible en este momento. Intenta de nuevo en unos minutos o escribe al restaurante. 🙏",
              });
            } catch {
              /* ignorar */
            }
          }

          await ctx.runMutation(internal.system.conversations.updateLastMessageAt, {
            threadId,
          });
          return;
        }

        const promptWithContext =
          modulesContext +
          customerContext +
          dateTimeContext +
          pdfsContext +
          preloadedRagContext +
          imageContext +
          (tenantPrompt?.prompt?.trim()
            ? `[Contexto del restaurante:]\n${tenantPrompt.prompt}\n\n`
            : "") +
          lastQuestionContext +
          `[Cliente dice:]\n${clientText}`;

        const tools: Record<string, unknown> = {
          searchTool: search,
          sendPdfTool: sendPdf,
          updateCustomerInfoTool: updateCustomerInfo,
          escalateConversationTool: escalateConversation,
          setPriorityTool: setPriority,
          resolveConversationTool: resolveConversation,
        };
        if (hasReservas) {
          tools.createReservationTool = createReservation;
          tools.cancelReservationTool = cancelReservation;
          tools.updateReservationTool = updateReservation;
        }
        if (hasPedidos) {
          tools.createOrderTool = createOrder;
          tools.updateOrderTool = updateOrder;
          tools.cancelOrderTool = cancelOrder;
        }
        if (hasPqr) tools.createPQRTool = createPQR;
        if (hasTrabajaConNosotros) {
          tools.searchVacanciesTool = searchVacancies;
        }

        let agentResult: Awaited<ReturnType<typeof supportAgent.generateText>> | null = null;
        try {
          if (isVisionMessage) {
            agentResult = await supportAgent.generateText(ctx, { threadId }, {
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: promptWithContext },
                    { type: "image", image: new URL(args.mediaUrl!) },
                  ],
                },
              ],
              tools: tools as Parameters<typeof supportAgent.generateText>[2]["tools"],
            });
          } else {
            agentResult = await supportAgent.generateText(ctx, { threadId }, {
              prompt: promptWithContext,
              tools: tools as Parameters<typeof supportAgent.generateText>[2]["tools"],
            });
          }
        } catch (agentErr) {
          const errMessage =
            agentErr instanceof Error
              ? agentErr.message
              : typeof agentErr === "object" && agentErr !== null
                ? JSON.stringify(agentErr)
                : String(agentErr);
          console.error("YCloud: generateText falló (revisa OPENAI_API_KEY, créditos OpenAI y logs del agente en Convex)", {
            tenantId: args.tenantId,
            conversationId,
            threadId,
            error: errMessage,
            stack: agentErr instanceof Error ? agentErr.stack : undefined,
          });
          if (args.channel === "whatsapp") {
            try {
              await ctx.runAction(api.ycloud.sendWhatsAppMessage, {
                tenantId: args.tenantId,
                conversationId,
                content:
                  "Lo sentimos, estamos experimentando dificultades técnicas en este momento.\n\nPor favor intenta de nuevo en unos minutos o contacta directamente al restaurante. 🙏",
              });
            } catch { /* ignorar error de envío */ }
          }
          // No re-throw: el error ya fue manejado con el mensaje de fallback
          return;
        }

        if (args.channel === "whatsapp") {
          /** Extrae texto plano del contenido de un mensaje del agente */
          function extractText(content: unknown): string {
            if (typeof content === "string") return content;
            if (Array.isArray(content)) {
              return (content as { type: string; text?: string }[])
                .filter((p) => p.type === "text")
                .map((p) => p.text ?? "")
                .join("");
            }
            return String(content ?? "");
          }

          /** Convierte salidas JSON del modelo en texto plano para WhatsApp. */
          function normalizeOutgoingText(text: string): string {
            const trimmed = text.trim();
            if (!trimmed) return "";
            if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) return trimmed;
            try {
              const parsed = JSON.parse(trimmed) as {
                response?: unknown;
                message?: unknown;
                text?: unknown;
              };
              const candidates = [parsed.response, parsed.message, parsed.text];
              for (const value of candidates) {
                if (typeof value === "string" && value.trim()) return value.trim();
              }
            } catch {
              // Si no es JSON válido, se envía el texto original.
            }
            return trimmed;
          }

          // Usar el texto devuelto directamente por el agente
          const directText = normalizeOutgoingText(
            typeof agentResult?.text === "string" ? agentResult.text : ""
          );

          /** Envía texto a WhatsApp; devuelve false si falla (sin lanzar). */
          async function trySend(text: string): Promise<boolean> {
            const t = normalizeOutgoingText(text).trim();
            if (!t) return false;
            try {
              await ctx.runAction(api.ycloud.sendWhatsAppMessage, {
                tenantId: args.tenantId,
                conversationId,
                content: t,
              });
              return true;
            } catch (sendErr) {
              console.error("YCloud: error al enviar respuesta", {
                tenantId: args.tenantId,
                error: sendErr instanceof Error ? sendErr.message : String(sendErr),
              });
              return false;
            }
          }

          // Detectar tools que ya enviaron su propio mensaje de WhatsApp directamente.
          // En esos casos la continuación generaría texto redundante o fuera de orden.
          const calledToolNames = (
            (agentResult?.toolCalls ?? []) as Array<{ toolName: string }>
          ).map((tc) => tc.toolName);
          const SELF_SENDING_TOOLS = new Set([
            "resolveConversationTool",
            "escalateConversationTool",
            "createPQRTool",
            "cancelOrderTool",
            "updateOrderTool",
            "sendPdfTool",
            "cancelReservationTool",
            "updateReservationTool",
            // createReservationTool ya NO envía WhatsApp directamente;
            // el LLM maneja la confirmación via directText.
          ]);
          const toolAlreadySentMessage = calledToolNames.some((name) =>
            SELF_SENDING_TOOLS.has(name)
          );

          // Si el createReservationTool falló (prefijo RESERVA_ERROR:), bloquear
          // el directText del LLM para que no confirme una reserva que no existe.
          const toolResults = (agentResult?.toolResults ?? []) as Array<{ result?: unknown }>;
          const reservationFailed = toolResults.some((tr) =>
            typeof tr.result === "string" && tr.result.startsWith("RESERVA_ERROR:")
          );

          if (directText && !reservationFailed) {
            await trySend(directText);
          } else if (reservationFailed) {
            // Si falló la reserva, enviar un mensaje explícito al cliente para evitar silencio.
            const rawReservationError = toolResults
              .map((tr) => (typeof tr.result === "string" ? tr.result : ""))
              .find((r) => r.startsWith("RESERVA_ERROR:"));
            const reservationError = rawReservationError
              ? rawReservationError.replace(/^RESERVA_ERROR:\s*/, "").trim()
              : "";
            const fallbackErrorText =
              "Lo siento, hubo un problema técnico al guardar la reserva. " +
              "¿Puedes intentarlo nuevamente por favor?";
            await trySend(reservationError || fallbackErrorText);
          } else if (toolAlreadySentMessage) {
            // El tool ya envió la confirmación al cliente — no enviar nada más
          } else {
            // El agente no produjo texto final (solo llamó herramientas y se detuvo).
            // Esto ocurre cuando gpt-4o decide que el resultado de la herramienta
            // es suficiente y no genera texto de continuación.
            //
            // Estrategia en cascada:
            // 1. Hacer una segunda llamada al agente SIN herramientas (solo genera texto).
            // 2. Si esa también falla o devuelve vacío, buscar en el hilo el último
            //    mensaje de herramienta con contenido útil (ej. searchTool).
            let sent = false;

            try {
              const continuationResult = await supportAgent.generateText(
                ctx,
                { threadId },
                {
                  prompt:
                    "Continúa la conversación con el cliente. Ya ejecutaste las herramientas necesarias. " +
                    "Haz la siguiente pregunta del flujo activo o entrega la información solicitada. " +
                    "No menciones herramientas ni procesos internos.",
                  // Sin herramientas: solo genera texto, no puede llamar tools de nuevo
                }
              );
              const continuationText =
                typeof continuationResult?.text === "string" ? continuationResult.text : "";
              if (continuationText) {
                sent = await trySend(continuationText);
              }
            } catch (contErr) {
              console.error("YCloud: segunda llamada al agente falló", {
                tenantId: args.tenantId,
                error: contErr instanceof Error ? contErr.message : String(contErr),
              });
            }

            if (!sent) {
              // Último recurso: buscar en el hilo el resultado de searchTool
              // (que ya es una respuesta formateada para el cliente).
              await new Promise((r) => setTimeout(r, 300));
              const messagesAfter: PaginationResult<MessageDoc> =
                await supportAgent.listMessages(ctx, {
                  threadId,
                  paginationOpts: { numItems: 100, cursor: null },
                });

              for (let i = messagesAfter.page.length - 1; i >= 0; i--) {
                const msg = messagesAfter.page[i];
                const role = msg.message?.role;
                const content = msg.message?.content;
                if (role === "assistant") {
                  const t = extractText(content);
                  if (t.trim()) { await trySend(t); break; }
                } else if (role === "tool") {
                  const t = typeof content === "string" ? content : extractText(content);
                  const isInternal = t.includes("INSTRUCCIÓN:") || t.includes("✅");
                  if (!isInternal && t.trim().length > 30) { await trySend(t); break; }
                }
              }
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
