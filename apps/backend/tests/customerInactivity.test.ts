import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import {
  DEFAULT_CHECK_IN_MESSAGE,
  DEFAULT_CHECK_IN_MINUTES,
  DEFAULT_CLOSE_MINUTES,
  DEFAULT_CLOSING_MESSAGE,
  MAX_MINUTES,
  applyInactivityDecision,
  decideOnCustomerMessage,
  decideOnInactivityJob,
  inactivityPatch,
  resolveInactivityConfig,
  runInactivityJob,
  type InactivityConfig,
  type InactivityConversationState,
  type InactivityDecision,
} from "../convex/lib/customerInactivity";
import type { Id } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";

/**
 * Cierre de conversaciones por silencio del cliente.
 *
 * El bug que blindan estos tests es el opuesto al de `agentHandoff`: aquí el
 * riesgo no es dejar un chat colgado, sino MOLESTAR O CERRARLE EL CHAT A ALGUIEN
 * QUE SÍ ESTÁ. Un job programado a 15 minutos corre en un mundo que ya cambió:
 * el cliente pudo escribir, un agente pudo tomar el chat, alguien pudo cerrarlo
 * o pudo quedar una PQR sin resolver. Cada uno de esos casos tiene su test, y
 * todos comprueban lo mismo: que NO se envió nada al cliente.
 *
 * El otro invariante vigilado es que jamás queden dos temporizadores vivos
 * sobre la misma conversación: el reemplazo cancela antes de programar.
 */

const MINUTO = 60 * 1000;

/** Fecha real, no 0: así un `lastCustomerMessageAt` ausente se nota. */
const INICIO = Date.UTC(2026, 0, 15, 9, 0, 0);

const ID_CONVERSACION = "conv_1" as Id<"conversations">;
const ID_TENANT = "tenant_1" as Id<"tenants">;

const JOB_INACTIVIDAD = "system/conversations:customerInactivityJob";
const ENVIO_WHATSAPP = "ycloud:sendWhatsAppMessageInternal";

/** Config equivalente a la que pediría el cliente: 15 y 20 minutos. */
const CONFIG: InactivityConfig = resolveInactivityConfig({
  enabled: true,
  checkInMinutes: 15,
  closeMinutes: 20,
});

function filaConversacion(
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    _id: ID_CONVERSACION,
    tenantId: ID_TENANT,
    threadId: "thread_1",
    externalContactId: "whatsapp:+573001112233",
    customerName: "Cliente",
    channel: "whatsapp",
    status: "open",
    lastCustomerMessageAt: INICIO,
    ...extra,
  };
}

// ─── Convex simulado ──────────────────────────────────────────────────────────
//
// `applyInactivityDecision` es la ÚNICA capa que escribe el estado de este
// ciclo, y no se puede ejecutar sin un `ctx`. Esto es ese `ctx` reducido a lo
// que la función usa: la fila, el doc del tenant, la tabla de PQR y el
// scheduler. Nada aquí reimplementa el algoritmo real.

type Programado = {
  jobId: string;
  nombre: string;
  enMs: number;
  args: Record<string, unknown>;
};

class ConvexSimulado {
  /** Traza ordenada: el ORDEN es parte del contrato, no un detalle. */
  traza: string[] = [];
  /** Jobs que el scheduler considera vivos (cancelar otro revienta, como en Convex). */
  jobsVivos = new Set<string>();
  programados: Programado[] = [];
  private seq = 0;

  constructor(
    public fila: Record<string, unknown> | null,
    public tenant: Record<string, unknown> | null = { _id: ID_TENANT },
    public pqrs: Array<Record<string, unknown>> = []
  ) {}

  db = {
    get: async (id: string) =>
      id === ID_TENANT ? this.tenant : this.fila,
    patch: async (_id: string, patch: Record<string, unknown>) => {
      this.traza.push(`patch(${Object.keys(patch).sort().join("+")})`);
      for (const [campo, valor] of Object.entries(patch)) {
        if (valor === undefined) delete this.fila![campo];
        else this.fila![campo] = valor;
      }
    },
    query: (_tabla: string) => ({
      withIndex: (_indice: string, _q: unknown) => ({
        collect: async () => this.pqrs,
      }),
    }),
  };

  scheduler = {
    cancel: async (jobId: string) => {
      this.traza.push(`cancel(${jobId})`);
      if (!this.jobsVivos.delete(jobId)) {
        throw new Error(`el job ${jobId} ya corrió o no existe`);
      }
    },
    runAfter: async (
      enMs: number,
      fn: unknown,
      args: Record<string, unknown>
    ) => {
      const nombre = getFunctionName(fn as never);
      const jobId = `job_${++this.seq}`;
      this.traza.push(`runAfter(${nombre})`);
      this.programados.push({ jobId, nombre, enMs, args });
      // El envío al cliente se programa a 0 ms y se consume solo; no es un
      // temporizador que nadie vaya a cancelar después.
      if (nombre === JOB_INACTIVIDAD) this.jobsVivos.add(jobId);
      return jobId;
    },
  };

  get ctx(): MutationCtx {
    return this as unknown as MutationCtx;
  }

  /** Mensajes que de verdad le habrían llegado al cliente por WhatsApp. */
  get enviados(): string[] {
    return this.programados
      .filter((p) => p.nombre === ENVIO_WHATSAPP)
      .map((p) => String(p.args.content));
  }

  /** Temporizadores de inactividad programados, en orden. */
  get temporizadores(): Programado[] {
    return this.programados.filter((p) => p.nombre === JOB_INACTIVIDAD);
  }
}

// ─── Simulador del ciclo completo ─────────────────────────────────────────────
//
// Une decisión (`decide*`, las funciones reales) con escritura
// (`applyInactivityDecision`, la misma que corre en producción). Lo único
// simulado es el reloj, el scheduler y las tablas.

class Chat {
  ahora = INICIO;
  convex: ConvexSimulado;

  constructor(
    extra: Record<string, unknown> = {},
    private config: InactivityConfig = CONFIG,
    pqrs: Array<Record<string, unknown>> = []
  ) {
    this.convex = new ConvexSimulado(
      filaConversacion({ lastCustomerMessageAt: INICIO, ...extra }),
      { _id: ID_TENANT },
      pqrs
    );
    vi.setSystemTime(this.ahora);
  }

  get fila(): Record<string, unknown> {
    return this.convex.fila!;
  }

  avanzar(ms: number): this {
    this.ahora += ms;
    vi.setSystemTime(this.ahora);
    return this;
  }

  /** El cliente escribe: `insertMessage` sella la hora y rearma el reloj. */
  async escribeElCliente(): Promise<this> {
    this.fila.lastCustomerMessageAt = this.ahora;
    await this.aplicar(
      decideOnCustomerMessage(
        this.fila as InactivityConversationState,
        this.config
      )
    );
    return this;
  }

  /** Dispara el temporizador que esté vivo. */
  async disparaElTemporizador(opts?: { tienePqrAbierta?: boolean }): Promise<this> {
    await this.aplicar(
      decideOnInactivityJob(
        this.fila as InactivityConversationState,
        this.config,
        this.ahora,
        opts
      )
    );
    return this;
  }

  private async aplicar(decision: InactivityDecision): Promise<void> {
    // El job que dispara ya se consumió: Convex no permitiría cancelarlo.
    this.convex.jobsVivos.delete(String(this.fila.customerInactivityJobId));
    await applyInactivityDecision(
      this.convex.ctx,
      ID_CONVERSACION,
      decision
    );
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(INICIO);
});
afterEach(() => {
  vi.useRealTimers();
});

// ─── Configuración ────────────────────────────────────────────────────────────

describe("resolveInactivityConfig", () => {
  it("sin configuración, el ciclo está apagado", () => {
    expect(resolveInactivityConfig(undefined).enabled).toBe(false);
    expect(resolveInactivityConfig(null).enabled).toBe(false);
  });

  it("usa los textos por defecto cuando el restaurante no los personaliza", () => {
    const config = resolveInactivityConfig({
      enabled: true,
      checkInMinutes: DEFAULT_CHECK_IN_MINUTES,
      closeMinutes: DEFAULT_CLOSE_MINUTES,
      checkInMessage: "   ",
    });
    expect(config.checkInMessage).toBe(DEFAULT_CHECK_IN_MESSAGE);
    expect(config.closingMessage).toBe(DEFAULT_CLOSING_MESSAGE);
  });

  it("empuja el cierre si quedó configurado antes o a la vez que la pregunta", () => {
    // Si no, el bot se despediría sin haber preguntado nunca.
    const config = resolveInactivityConfig({
      enabled: true,
      checkInMinutes: 20,
      closeMinutes: 10,
    });
    expect(config.closeMs).toBeGreaterThan(config.checkInMs);
  });

  it("acota valores absurdos en vez de aceptarlos", () => {
    const config = resolveInactivityConfig({
      enabled: true,
      checkInMinutes: 0,
      closeMinutes: 99_999,
    });
    expect(config.checkInMs).toBe(1 * MINUTO);
    expect(config.closeMs).toBe(MAX_MINUTES * MINUTO);
  });

  it("proteger las PQR abiertas es el comportamiento por defecto", () => {
    const config = resolveInactivityConfig({
      enabled: true,
      checkInMinutes: 15,
      closeMinutes: 20,
    });
    expect(config.skipWhenOpenPqr).toBe(true);
  });
});

// ─── Camino feliz ─────────────────────────────────────────────────────────────

describe("ciclo completo", () => {
  it("cliente calla 15 min → pregunta; calla 20 → se despide y cierra", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();

    expect(chat.fila.inactivityStage).toBe("armed");
    expect(chat.convex.temporizadores[0].enMs).toBe(15 * MINUTO);
    expect(chat.convex.enviados).toEqual([]);

    await chat.avanzar(15 * MINUTO).disparaElTemporizador();

    expect(chat.convex.enviados).toEqual([DEFAULT_CHECK_IN_MESSAGE]);
    expect(chat.fila.inactivityStage).toBe("pinged");
    expect(chat.fila.status).toBe("open");
    // Lo que falta para los 20 minutos de silencio.
    expect(chat.convex.temporizadores[1].enMs).toBe(5 * MINUTO);

    await chat.avanzar(5 * MINUTO).disparaElTemporizador();

    expect(chat.convex.enviados).toEqual([
      DEFAULT_CHECK_IN_MESSAGE,
      DEFAULT_CLOSING_MESSAGE,
    ]);
    expect(chat.fila.status).toBe("closed");
    expect(chat.fila.customerInactivityJobId).toBeUndefined();
    expect(chat.fila.inactivityStage).toBeUndefined();
  });

  it("si el cliente responde al «¿sigues ahí?», el reloj vuelve a empezar", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();
    await chat.avanzar(15 * MINUTO).disparaElTemporizador();
    expect(chat.fila.inactivityStage).toBe("pinged");

    await chat.avanzar(MINUTO).escribeElCliente();

    expect(chat.fila.inactivityStage).toBe("armed");
    expect(chat.fila.status).toBe("open");

    // Y a los 20 minutos del ping —que ya no significan nada— no pasa nada:
    // el silencio se cuenta desde el mensaje nuevo.
    await chat.avanzar(14 * MINUTO).disparaElTemporizador();
    expect(chat.convex.enviados).toEqual([DEFAULT_CHECK_IN_MESSAGE]);
  });

  it("el silencio se mide desde el cliente, no desde la última respuesta del bot", async () => {
    // `lastMessageAt` avanza con cada mensaje del bot; si el reloj se guiara por
    // él, un chat en el que solo habla el bot no acumularía silencio nunca.
    const chat = new Chat({ lastMessageAt: INICIO });
    await chat.escribeElCliente();

    chat.avanzar(14 * MINUTO);
    chat.fila.lastMessageAt = chat.ahora; // el bot respondió tarde
    await chat.avanzar(MINUTO).disparaElTemporizador();

    expect(chat.convex.enviados).toEqual([DEFAULT_CHECK_IN_MESSAGE]);
  });
});

// ─── Todo lo que debe impedir que se le escriba al cliente ────────────────────

describe("un job viejo no molesta a nadie", () => {
  it("el cliente escribió después: reprograma lo que falta y no envía nada", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();

    // Escribe a los 14 min; la cancelación del job no llega a tiempo y el job
    // viejo corre igual un minuto después.
    await chat.avanzar(14 * MINUTO).escribeElCliente();
    await chat.avanzar(MINUTO).disparaElTemporizador();

    expect(chat.convex.enviados).toEqual([]);
    const ultimo = chat.convex.temporizadores.at(-1)!;
    expect(ultimo.enMs).toBe(14 * MINUTO);
    expect(chat.fila.inactivityStage).toBe("armed");
  });

  it("un agente humano tomó el chat: ni pregunta ni cierra", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();

    chat.fila.assignedTo = "agente_ana";
    await chat.avanzar(15 * MINUTO).disparaElTemporizador();

    expect(chat.convex.enviados).toEqual([]);
    expect(chat.fila.status).toBe("open");
    expect(chat.fila.customerInactivityJobId).toBeUndefined();
  });

  it("el chat ya estaba cerrado: no se envía la despedida", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();

    chat.fila.status = "closed";
    await chat.avanzar(20 * MINUTO).disparaElTemporizador();

    expect(chat.convex.enviados).toEqual([]);
  });

  it("una PQR sin resolver deja el caso en manos de una persona", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();

    await chat
      .avanzar(15 * MINUTO)
      .disparaElTemporizador({ tienePqrAbierta: true });

    expect(chat.convex.enviados).toEqual([]);
    expect(chat.fila.status).toBe("open");
    expect(chat.fila.customerInactivityJobId).toBeUndefined();
  });

  it("si el restaurante desactiva ese resguardo, la PQR abierta no frena el cierre", async () => {
    const config = resolveInactivityConfig({
      enabled: true,
      checkInMinutes: 15,
      closeMinutes: 20,
      skipWhenOpenPqr: false,
    });
    const chat = new Chat({}, config);
    await chat.escribeElCliente();
    await chat
      .avanzar(15 * MINUTO)
      .disparaElTemporizador({ tienePqrAbierta: true });

    expect(chat.convex.enviados).toEqual([DEFAULT_CHECK_IN_MESSAGE]);
  });

  it("sin registro del último mensaje del cliente no se asume silencio", async () => {
    // Conversaciones anteriores a este campo: no se puede demostrar que el
    // cliente lleve callado, así que no se les escribe.
    const chat = new Chat({
      lastCustomerMessageAt: undefined,
      inactivityStage: "armed",
    });
    await chat.avanzar(60 * MINUTO).disparaElTemporizador();

    expect(chat.convex.enviados).toEqual([]);
  });

  it("un canal que no es WhatsApp no entra al ciclo", async () => {
    const chat = new Chat({ channel: "webchat" });
    await chat.escribeElCliente();

    expect(chat.convex.temporizadores).toEqual([]);
    expect(chat.convex.enviados).toEqual([]);
  });

  it("con el ciclo apagado no se programa nada", async () => {
    const apagado = resolveInactivityConfig({
      enabled: false,
      checkInMinutes: 15,
      closeMinutes: 20,
    });
    const chat = new Chat({}, apagado);
    await chat.escribeElCliente();

    expect(chat.convex.temporizadores).toEqual([]);
    expect(chat.convex.enviados).toEqual([]);
  });
});

// ─── Invariantes de la capa que escribe ───────────────────────────────────────

describe("la capa que escribe", () => {
  it("cancela el temporizador anterior ANTES de crear el nuevo", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();
    const primerJob = chat.fila.customerInactivityJobId;
    chat.convex.traza.length = 0;
    chat.convex.jobsVivos.add(String(primerJob));

    await chat.avanzar(MINUTO).escribeElCliente();

    expect(chat.convex.traza).toEqual([
      `cancel(${primerJob})`,
      `runAfter(${JOB_INACTIVIDAD})`,
      "patch(customerInactivityJobId+inactivityStage+updatedAt)",
    ]);
  });

  it("nunca queda más de un temporizador vivo por conversación", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();
    for (let i = 0; i < 5; i++) {
      await chat.avanzar(MINUTO).escribeElCliente();
    }
    expect(chat.convex.jobsVivos.size).toBe(1);
  });

  it("cerrar por silencio no deja reloj ni etapa a medias", async () => {
    const chat = new Chat();
    await chat.escribeElCliente();
    await chat.avanzar(15 * MINUTO).disparaElTemporizador();
    await chat.avanzar(5 * MINUTO).disparaElTemporizador();

    expect(chat.convex.jobsVivos.size).toBe(0);
    expect(chat.fila).not.toHaveProperty("customerInactivityJobId");
    expect(chat.fila).not.toHaveProperty("inactivityStage");
  });

  it("un job que corre tarde no le regala al cliente el retraso acumulado", () => {
    // Si el cierre se programara como `closeMs - checkInMs`, un job que corre
    // 4 minutos tarde cerraría a los 24 en vez de a los 20.
    const decision = decideOnInactivityJob(
      { status: "open", channel: "whatsapp", lastCustomerMessageAt: INICIO },
      CONFIG,
      INICIO + 19 * MINUTO
    );
    expect(decision.accion).toBe("preguntar");
    if (decision.accion !== "preguntar") return;
    expect(decision.enMs).toBe(MINUTO);
  });

  it("no baja de un segundo aunque el job corra pasadísimo de hora", () => {
    const decision = decideOnInactivityJob(
      { status: "open", channel: "whatsapp", lastCustomerMessageAt: INICIO },
      CONFIG,
      INICIO + 3 * 60 * MINUTO
    );
    expect(decision.accion).toBe("preguntar");
    if (decision.accion !== "preguntar") return;
    expect(decision.enMs).toBeGreaterThanOrEqual(1_000);
  });

  it("no hay patch que escribir cuando la decisión es no hacer nada", () => {
    expect(
      inactivityPatch(
        { accion: "nada", motivo: "sin-conversacion" },
        { now: INICIO }
      )
    ).toBeNull();
  });
});

// ─── El job real, con la consulta de PQR incluida ─────────────────────────────

describe("runInactivityJob", () => {
  it("lee las PQR del chat y respeta las que siguen abiertas", async () => {
    const convex = new ConvexSimulado(
      filaConversacion({
        lastCustomerMessageAt: INICIO,
        inactivityStage: "pinged",
      }),
      {
        _id: ID_TENANT,
        conversationInactivity: {
          enabled: true,
          checkInMinutes: 15,
          closeMinutes: 20,
        },
      },
      [{ status: "in_progress", conversationId: ID_CONVERSACION }]
    );
    vi.setSystemTime(INICIO + 20 * MINUTO);

    await runInactivityJob(convex.ctx, ID_CONVERSACION);

    expect(convex.enviados).toEqual([]);
    expect(convex.fila!.status).toBe("open");
  });

  it("cierra cuando las PQR del chat ya están resueltas", async () => {
    const convex = new ConvexSimulado(
      filaConversacion({
        lastCustomerMessageAt: INICIO,
        inactivityStage: "pinged",
      }),
      {
        _id: ID_TENANT,
        conversationInactivity: {
          enabled: true,
          checkInMinutes: 15,
          closeMinutes: 20,
        },
      },
      [{ status: "resolved", conversationId: ID_CONVERSACION }]
    );
    vi.setSystemTime(INICIO + 20 * MINUTO);

    await runInactivityJob(convex.ctx, ID_CONVERSACION);

    expect(convex.enviados).toEqual([DEFAULT_CLOSING_MESSAGE]);
    expect(convex.fila!.status).toBe("closed");
  });

  it("un restaurante sin la función activada no recibe ningún envío", async () => {
    const convex = new ConvexSimulado(
      filaConversacion({ inactivityStage: "pinged" }),
      { _id: ID_TENANT } // sin conversationInactivity
    );
    vi.setSystemTime(INICIO + 60 * MINUTO);

    await runInactivityJob(convex.ctx, ID_CONVERSACION);

    expect(convex.enviados).toEqual([]);
    expect(convex.fila!.status).toBe("open");
  });
});
