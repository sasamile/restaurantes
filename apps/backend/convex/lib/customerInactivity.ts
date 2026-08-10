import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Cierre de conversaciones por silencio del CLIENTE.
 *
 * El bot solo se despierta cuando entra un webhook de WhatsApp. Si el cliente
 * deja de escribir, no ocurre nada más: el chat se queda abierto para siempre.
 * Por eso la instrucción "si el usuario no responde en varios minutos, pregunta
 * si sigue ahí" que vive en el prompt es letra muerta —el modelo no tiene forma
 * de ejecutarla— y esto tiene que resolverse con un temporizador, no con texto.
 *
 * Ciclo: cada mensaje del cliente arma un reloj. Al llegar a `checkInMinutes`
 * de silencio el bot pregunta si sigue ahí; al llegar a `closeMinutes` se
 * despide y cierra el caso. Cualquier mensaje del cliente en medio reinicia
 * todo desde cero.
 *
 * Igual que en `agentHandoff.ts`, toda la lógica vive en funciones puras que
 * reciben estado y devuelven una decisión; las mutations son capa fina.
 *
 * INVARIANTE: nunca hay más de un job de este ciclo por conversación, y el job
 * siempre revalida el estado antes de escribirle al cliente. Un job viejo que
 * no se alcanzó a cancelar no debe molestar a alguien que ya volvió a escribir.
 */

// ─── Configuración ────────────────────────────────────────────────────────────

export const DEFAULT_CHECK_IN_MINUTES = 15;
export const DEFAULT_CLOSE_MINUTES = 20;

export const DEFAULT_CHECK_IN_MESSAGE =
  "¿Sigues ahí? 😊 Si todavía necesitas ayuda, cuéntame y seguimos con tu solicitud.";

export const DEFAULT_CLOSING_MESSAGE =
  "Como no he recibido respuesta, voy a cerrar esta conversación por ahora. " +
  "Si necesitas algo más, escríbeme cuando quieras y con gusto te ayudo. " +
  "¡Gracias por comunicarte con nosotros! 🙌";

/** Cotas de seguridad para los minutos configurables desde el panel. */
export const MIN_MINUTES = 1;
export const MAX_MINUTES = 24 * 60;

/** Lo que guarda el tenant, tal cual sale de la base. */
export type InactivityConfigInput =
  | {
      enabled: boolean;
      checkInMinutes: number;
      closeMinutes: number;
      checkInMessage?: string;
      closingMessage?: string;
      skipWhenOpenPqr?: boolean;
    }
  | null
  | undefined;

/** Configuración ya normalizada: sin huecos, en milisegundos y con textos. */
export type InactivityConfig = {
  enabled: boolean;
  checkInMs: number;
  closeMs: number;
  checkInMessage: string;
  closingMessage: string;
  skipWhenOpenPqr: boolean;
};

function clampMinutes(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), MIN_MINUTES), MAX_MINUTES);
}

/**
 * Normaliza lo que haya guardado el restaurante.
 *
 * `undefined` = apagado: los restaurantes que ya existen no cambian de
 * comportamiento hasta que alguien lo active a propósito.
 *
 * Si el cierre quedara configurado antes o a la vez que la pregunta, el bot se
 * despediría sin haber preguntado nunca; en ese caso se empuja el cierre un
 * minuto después en lugar de rechazar la configuración.
 */
export function resolveInactivityConfig(
  raw: InactivityConfigInput
): InactivityConfig {
  const enabled = raw?.enabled === true;
  const checkInMinutes = clampMinutes(raw?.checkInMinutes, DEFAULT_CHECK_IN_MINUTES);
  const closeMinutes = Math.max(
    clampMinutes(raw?.closeMinutes, DEFAULT_CLOSE_MINUTES),
    checkInMinutes + 1
  );

  const checkInMessage = raw?.checkInMessage?.trim() || DEFAULT_CHECK_IN_MESSAGE;
  const closingMessage = raw?.closingMessage?.trim() || DEFAULT_CLOSING_MESSAGE;

  return {
    enabled,
    checkInMs: checkInMinutes * 60_000,
    closeMs: closeMinutes * 60_000,
    checkInMessage,
    closingMessage,
    skipWhenOpenPqr: raw?.skipWhenOpenPqr !== false,
  };
}

// ─── Núcleo puro ──────────────────────────────────────────────────────────────

export type InactivityStage = "armed" | "pinged";

/**
 * Lo único que la máquina de estados necesita de una conversación. Los ids van
 * como `string` para que el núcleo sea puro y testeable sin Convex; un
 * `Doc<"conversations">` encaja tal cual.
 */
export type InactivityConversationState = {
  status?: string | null;
  channel?: string | null;
  /** Agente humano dueño del chat. Ausente = modo bot. */
  assignedTo?: string | null;
  /** Último mensaje del cliente. Ausente = nunca escribió. */
  lastCustomerMessageAt?: number | null;
  inactivityStage?: InactivityStage | null;
  customerInactivityJobId?: string | null;
};

export type InactivityMotivo =
  | "sin-conversacion"
  | "desactivado"
  | "canal-no-soportado"
  | "chat-cerrado"
  | "chat-de-agente"
  | "sin-mensaje-del-cliente"
  | "mensaje-del-cliente"
  | "cliente-escribio-despues"
  | "pqr-abierta"
  | "silencio-de-espera"
  | "silencio-de-cierre";

export type InactivityDecision =
  /** No tocar nada. */
  | { accion: "nada"; motivo: InactivityMotivo }
  /** Apagar el reloj y soltar el handle del job. */
  | { accion: "cancelar"; motivo: InactivityMotivo }
  /** (Re)armar el reloj sin escribirle al cliente. */
  | {
      accion: "programar";
      enMs: number;
      etapa: InactivityStage;
      motivo: InactivityMotivo;
    }
  /** Preguntar si sigue ahí y dejar armado el cierre. */
  | {
      accion: "preguntar";
      mensaje: string;
      enMs: number;
      motivo: InactivityMotivo;
    }
  /** Despedirse y cerrar el caso. */
  | { accion: "cerrar"; mensaje: string; motivo: InactivityMotivo };

function cancelarSiHayJob(
  conv: InactivityConversationState,
  motivo: InactivityMotivo
): InactivityDecision {
  return conv.customerInactivityJobId || conv.inactivityStage
    ? { accion: "cancelar", motivo }
    : { accion: "nada", motivo };
}

/**
 * Razones por las que este ciclo no aplica a una conversación, en el orden en
 * que hay que comprobarlas. Devuelve `null` si sí aplica.
 *
 * Vive aparte porque la comprueban los dos caminos (mensaje entrante y job), y
 * tenerla duplicada sería la forma más fácil de que uno de los dos se olvidara
 * de mirar `assignedTo` y el bot interrumpiera a un agente humano.
 */
function motivoParaNoAplicar(
  conv: InactivityConversationState,
  config: InactivityConfig
): InactivityMotivo | null {
  if (!config.enabled) return "desactivado";
  // El envío del ping y de la despedida sale por WhatsApp; en otros canales no
  // hay por dónde escribirle al cliente.
  if (conv.channel && conv.channel !== "whatsapp") return "canal-no-soportado";
  // Un chat en manos de una persona no lo interrumpe ni lo cierra el bot.
  if (conv.assignedTo) return "chat-de-agente";
  return null;
}

/**
 * Llega un mensaje del cliente: el reloj vuelve a cero.
 *
 * Se asume que `lastCustomerMessageAt` se está poniendo a `now` en la misma
 * mutation, así que la espera completa es `checkInMs`.
 */
export function decideOnCustomerMessage(
  conv: InactivityConversationState | null | undefined,
  config: InactivityConfig
): InactivityDecision {
  if (!conv) return { accion: "nada", motivo: "sin-conversacion" };

  const noAplica = motivoParaNoAplicar(conv, config);
  if (noAplica) return cancelarSiHayJob(conv, noAplica);

  return {
    accion: "programar",
    enMs: config.checkInMs,
    etapa: "armed",
    motivo: "mensaje-del-cliente",
  };
}

/**
 * Disparó el temporizador. Defensivo a propósito: entre que el job se programó
 * y que corre, el cliente pudo escribir, un agente pudo tomar el chat o alguien
 * pudo cerrarlo desde la bandeja.
 *
 * `tienePqrAbierta` lo resuelve quien llama porque requiere leer otra tabla, y
 * el núcleo no toca la base.
 */
export function decideOnInactivityJob(
  conv: InactivityConversationState | null | undefined,
  config: InactivityConfig,
  now: number,
  opts?: { tienePqrAbierta?: boolean }
): InactivityDecision {
  if (!conv) return { accion: "nada", motivo: "sin-conversacion" };

  const noAplica = motivoParaNoAplicar(conv, config);
  if (noAplica) return cancelarSiHayJob(conv, noAplica);

  // Ya cerrada (por el agente, por el bot o por el propio cliente): no hay nadie
  // esperando respuesta.
  if (conv.status === "closed") return cancelarSiHayJob(conv, "chat-cerrado");

  // Sin registro de mensajes del cliente no se puede afirmar que lleve
  // callado: es el caso de las conversaciones anteriores a este campo.
  if (typeof conv.lastCustomerMessageAt !== "number") {
    return cancelarSiHayJob(conv, "sin-mensaje-del-cliente");
  }

  const etapa: InactivityStage = conv.inactivityStage ?? "armed";
  const objetivoMs = etapa === "armed" ? config.checkInMs : config.closeMs;
  const silencioMs = now - conv.lastCustomerMessageAt;
  const restanteMs = objetivoMs - silencioMs;

  // El cliente escribió después de programarse este job y la cancelación no
  // llegó a tiempo. Este job ya se consumió, así que hay que reprogramar lo que
  // falte o la conversación se quedaría sin reloj.
  if (restanteMs > 0) {
    return {
      accion: "programar",
      enMs: restanteMs,
      etapa,
      motivo: "cliente-escribio-despues",
    };
  }

  // Una PQR sin resolver significa que el caso sigue vivo aunque el cliente
  // haya dejado de escribir: cerrarlo automáticamente lo escondería de la
  // bandeja. Se apaga el reloj y queda en manos de una persona.
  if (config.skipWhenOpenPqr && opts?.tienePqrAbierta) {
    return cancelarSiHayJob(conv, "pqr-abierta");
  }

  if (etapa === "armed") {
    return {
      accion: "preguntar",
      mensaje: config.checkInMessage,
      // Lo que falte para el cierre desde AHORA, no `closeMs - checkInMs`: si
      // este job corrió tarde, esa resta le regalaría al cliente el retraso
      // acumulado.
      enMs: Math.max(config.closeMs - silencioMs, 1_000),
      motivo: "silencio-de-espera",
    };
  }

  return {
    accion: "cerrar",
    mensaje: config.closingMessage,
    motivo: "silencio-de-cierre",
  };
}

// ─── Escritura ────────────────────────────────────────────────────────────────

export type InactivityPatch<JobId = string> = {
  customerInactivityJobId?: JobId | undefined;
  inactivityStage?: InactivityStage | undefined;
  status?: "closed";
  updatedAt: number;
};

/**
 * Traduce una decisión al patch que hay que escribir. Puro a propósito: es la
 * única definición de "cómo queda la conversación", así que los tests y el
 * camino real de Convex ejecutan el mismo código.
 *
 * Devuelve `null` cuando no hay nada que escribir.
 */
export function inactivityPatch<JobId>(
  decision: InactivityDecision,
  opts: { now: number; jobPrevio?: JobId | null; nuevoJobId?: JobId | null }
): InactivityPatch<JobId> | null {
  if (decision.accion === "nada") return null;

  if (decision.accion === "cancelar") {
    return {
      customerInactivityJobId: undefined,
      inactivityStage: undefined,
      updatedAt: opts.now,
    };
  }

  if (decision.accion === "programar") {
    return {
      customerInactivityJobId: opts.nuevoJobId ?? undefined,
      inactivityStage: decision.etapa,
      updatedAt: opts.now,
    };
  }

  if (decision.accion === "preguntar") {
    return {
      customerInactivityJobId: opts.nuevoJobId ?? undefined,
      inactivityStage: "pinged",
      updatedAt: opts.now,
    };
  }

  // cerrar: el caso queda cerrado y sin reloj.
  return {
    customerInactivityJobId: undefined,
    inactivityStage: undefined,
    status: "closed",
    updatedAt: opts.now,
  };
}

// ─── Capa de aplicación ───────────────────────────────────────────────────────

async function cancelarJobPendiente(
  ctx: MutationCtx,
  jobId: Id<"_scheduled_functions"> | undefined
): Promise<void> {
  if (!jobId) return;
  try {
    await ctx.scheduler.cancel(jobId);
  } catch {
    // El job ya corrió o fue cancelado previamente; ignorar.
  }
}

/** Configuración del restaurante dueño de la conversación. */
async function configDeLaConversacion(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
): Promise<InactivityConfig> {
  const tenant = await ctx.db.get(tenantId);
  return resolveInactivityConfig(tenant?.conversationInactivity);
}

/** ¿Queda alguna PQR de este chat sin resolver? */
export async function tienePqrAbierta(
  ctx: MutationCtx,
  conversationId: Id<"conversations">
): Promise<boolean> {
  const pqrs = await ctx.db
    .query("pqrs")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
  return pqrs.some((p) => p.status === "open" || p.status === "in_progress");
}

/**
 * Ejecuta una decisión. Único sitio que escribe el estado de este ciclo, para
 * que no haya dos formas distintas de dejarlo.
 *
 * El job anterior se cancela SIEMPRE antes de crear el nuevo, dentro de la
 * misma mutation, para que el reemplazo sea atómico y nunca queden dos
 * temporizadores compitiendo por el mismo chat.
 *
 * Los mensajes al cliente salen por el scheduler y no aquí mismo: enviar es una
 * action (hace fetch a YCloud) y esto es una mutation. Programarlos a 0 ms deja
 * el cambio de estado y el envío en la misma transacción lógica: si la mutation
 * falla, no se envía nada.
 */
export async function applyInactivityDecision(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  decision: InactivityDecision
): Promise<void> {
  if (decision.accion === "nada") return;

  const conv = await ctx.db.get(conversationId);
  if (!conv) return;
  const now = Date.now();

  const jobPrevio = conv.customerInactivityJobId;
  await cancelarJobPendiente(ctx, jobPrevio);

  const nuevoJobId =
    decision.accion === "programar" || decision.accion === "preguntar"
      ? await ctx.scheduler.runAfter(
          decision.enMs,
          internal.system.conversations.customerInactivityJob,
          { conversationId }
        )
      : null;

  const patch = inactivityPatch<Id<"_scheduled_functions">>(decision, {
    now,
    jobPrevio,
    nuevoJobId,
  });
  if (patch) await ctx.db.patch(conversationId, patch);

  if (decision.accion !== "preguntar" && decision.accion !== "cerrar") return;

  await ctx.scheduler.runAfter(0, internal.ycloud.sendWhatsAppMessageInternal, {
    tenantId: conv.tenantId,
    conversationId,
    content: decision.mensaje,
  });
}

// ─── Atajos que usan las mutations ────────────────────────────────────────────

/**
 * Rearma el reloj porque el cliente acaba de escribir.
 *
 * Se llama desde el insert de mensajes, que es el único punto por el que pasan
 * todos los INBOUND (webhook, reintentos y cualquier camino futuro). Colgarlo
 * del webhook en vez de aquí dejaría fuera los caminos que no pasan por él.
 */
export async function scheduleCustomerInactivity(
  ctx: MutationCtx,
  conversationId: Id<"conversations">
): Promise<void> {
  const conv = await ctx.db.get(conversationId);
  if (!conv) return;
  const config = await configDeLaConversacion(ctx, conv.tenantId);
  await applyInactivityDecision(
    ctx,
    conversationId,
    decideOnCustomerMessage(conv, config)
  );
}

/** Cuerpo del job `customerInactivityJob`. */
export async function runInactivityJob(
  ctx: MutationCtx,
  conversationId: Id<"conversations">
): Promise<void> {
  const conv = await ctx.db.get(conversationId);
  if (!conv) return;
  const config = await configDeLaConversacion(ctx, conv.tenantId);

  // La PQR solo se consulta si el resto del estado ya dio vía libre: es una
  // lectura extra que no tiene sentido pagar en los casos que se descartan.
  const preliminar = decideOnInactivityJob(conv, config, Date.now());
  if (preliminar.accion !== "preguntar" && preliminar.accion !== "cerrar") {
    await applyInactivityDecision(ctx, conversationId, preliminar);
    return;
  }

  const decision = decideOnInactivityJob(conv, config, Date.now(), {
    tienePqrAbierta: await tienePqrAbierta(ctx, conversationId),
  });
  await applyInactivityDecision(ctx, conversationId, decision);
}
