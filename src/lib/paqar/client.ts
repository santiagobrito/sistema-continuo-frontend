/**
 * Cliente HTTP para el API Correo Argentino PAQ.AR v2.
 *
 * Uso:
 *   import { paqarClient } from "@/lib/paqar/client";
 *   await paqarClient.auth();
 *   const { trackingNumber } = await paqarClient.createOrder(payload);
 *
 * Config via env vars (ver docs/paqar-integration.md).
 */

import type {
  PaqarCreateOrderPayload,
  PaqarCreateOrderResponse,
  PaqarLabelRequest,
  PaqarLabelResponse,
  PaqarTrackingResponse,
  PaqarAgency,
  PaqarCancelResponse,
  PaqarApiError,
  PaqarRateRequest,
  PaqarRateResponse,
  PaqarRate,
} from "./types";
import { PaqarApiException } from "./types";

interface PaqarConfig {
  apiKey: string;
  agreement: string;
  baseUrl: string;
  serviceType: string;
  sellerId?: string;
}

function readConfig(): PaqarConfig {
  const mode = process.env.PAQAR_MODE === "prod" ? "prod" : "test";
  const baseUrl =
    mode === "prod"
      ? process.env.PAQAR_URL_PROD || "https://api.correoargentino.com.ar/paqar/v1"
      : process.env.PAQAR_URL_TEST || "https://apitest.correoargentino.com.ar/paqar/v1";

  return {
    apiKey: process.env.PAQAR_API_KEY || "",
    agreement: process.env.PAQAR_AGREEMENT || "",
    baseUrl,
    serviceType: process.env.PAQAR_SERVICE_TYPE || "CP",
    sellerId: process.env.PAQAR_SELLER_ID || undefined,
  };
}

/**
 * Reintentos ante fallos transitorios de Correo Argentino.
 *
 * Por qué existe: el gateway de CA corta a los ~31 s y devuelve 504 en algo así
 * como 1 de cada 3-4 llamadas a `/labels` (medido el 2026-06-22), y cada tanto
 * un servicio interno suyo se cae del todo y todos los endpoints responden 5xx
 * (2026-08-18: `/agencies` daba `No route to host` y `/orders` un 400 genérico).
 * Sin reintento, cada hipo del proveedor sale por pantalla como "error al
 * generar etiqueta" y termina en alguien apretando el botón a mano.
 *
 * Los tiempos son crecientes y cortos a propósito: esto cubre el hipo de
 * segundos. Una caída de horas la cubre el cron `paqar-retry-pendientes`.
 */
const RETRY_DELAYS_MS = [1_000, 3_000, 8_000];

/** Corte propio, por debajo de los ~31 s a los que corta el gateway de CA. */
const REQUEST_TIMEOUT_MS = 25_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * ¿Vale la pena reintentar este error?
 *
 * Sí: se cayó la conexión, venció el timeout, o CA devolvió 5xx / 429.
 * No: 4xx que no sea 429 — el payload no le gusta y no va a gustarle más por
 * insistir. La excepción es el 400 genérico "Fault occurred while processing",
 * que CA usa cuando revienta un servicio interno suyo: ahí el dato está bien y
 * la orden NO llega a crearse (comprobado el 2026-08-18 reenviando un payload
 * que la API había aceptado días antes).
 */
function isTransient(err: unknown, idempotent = true): boolean {
  // El 400 genérico es el único fallo del proveedor que se puede reintentar
  // aunque la llamada NO sea idempotente: CA rechazó antes de crear nada.
  const es400Generico =
    err instanceof PaqarApiException &&
    err.status === 400 &&
    /fault occurred while processing/i.test(describeError(err));
  if (es400Generico) return true;
  if (!idempotent) return false;

  if (err instanceof PaqarApiException) return err.status >= 500 || err.status === 429;
  // fetch aborta por timeout (TimeoutError) o corta la conexión (TypeError).
  return err instanceof Error;
}

function describeError(err: unknown): string {
  if (err instanceof PaqarApiException) {
    const body = typeof err.body === "string" ? err.body : JSON.stringify(err.body ?? "");
    return `${err.status} ${body}`.slice(0, 200);
  }
  return err instanceof Error ? err.message : String(err);
}

/** Envuelve una llamada suelta (las que no pasan por `request()`) con los mismos reintentos. */
async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let intento = 0; intento <= RETRY_DELAYS_MS.length; intento++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const espera = RETRY_DELAYS_MS[intento];
      if (espera === undefined || !isTransient(err)) throw err;
      console.warn(
        `[paqar] ${label} falló (${describeError(err)}), reintento ${intento + 1}/${RETRY_DELAYS_MS.length} en ${espera}ms`
      );
      await sleep(espera);
    }
  }
  throw last;
}

export class PaqarClient {
  private config: PaqarConfig;

  constructor(config?: Partial<PaqarConfig>) {
    this.config = { ...readConfig(), ...config };
  }

  get serviceType() {
    return this.config.serviceType;
  }

  get sellerId() {
    return this.config.sellerId;
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.agreement);
  }

  private headers(): HeadersInit {
    if (!this.isConfigured()) {
      throw new Error(
        "PAQ.AR no está configurado. Faltan PAQAR_API_KEY o PAQAR_AGREEMENT en env."
      );
    }
    return {
      authorization: `Apikey ${this.config.apiKey}`,
      agreement: this.config.agreement,
      "Content-Type": "application/json",
    };
  }

  /**
   * Una sola pasada HTTP. `request()` la envuelve con los reintentos.
   */
  private async attempt<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: unknown,
    query?: Record<string, string | boolean | undefined>
  ): Promise<{ status: number; data: T | null }> {
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      throw new PaqarApiException(
        res.status,
        (parsed as PaqarApiError) ?? text,
        path
      );
    }

    return { status: res.status, data: parsed as T };
  }

  /**
   * Igual que `attempt()` pero reintentando los fallos transitorios de CA.
   *
   * `idempotent: false` para lo que no se puede repetir a ciegas (crear una
   * orden): ahí un 504 es ambiguo — puede haber creado la preimposición y
   * habernos perdido la respuesta — y reintentar duplicaría el envío. Ver
   * `createOrder()`.
   */
  private async request<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: unknown,
    query?: Record<string, string | boolean | undefined>,
    opts?: { idempotent?: boolean }
  ): Promise<{ status: number; data: T | null }> {
    const idempotent = opts?.idempotent !== false;
    let last: unknown;

    for (let intento = 0; intento <= RETRY_DELAYS_MS.length; intento++) {
      try {
        return await this.attempt<T>(method, path, body, query);
      } catch (err) {
        last = err;
        const espera = RETRY_DELAYS_MS[intento];
        if (espera === undefined || !isTransient(err, idempotent)) throw err;
        console.warn(
          `[paqar] ${method} ${path} falló (${describeError(err)}), reintento ${intento + 1}/${RETRY_DELAYS_MS.length} en ${espera}ms`
        );
        await sleep(espera);
      }
    }
    throw last;
  }

  /** GET /auth — valida credenciales. Éxito: 204 No Content. */
  async auth(): Promise<boolean> {
    const { status } = await this.request<never>("GET", "/auth");
    return status === 204;
  }

  /**
   * POST /orders — crea una orden (un bulto).
   *
   * `idempotent: false`: un 504 acá puede significar que CA creó la
   * preimposición y perdimos la respuesta. Reintentar duplicaría el envío, así
   * que solo se reintenta el 400 genérico, en el que CA no llegó a crear nada.
   */
  async createOrder(
    payload: PaqarCreateOrderPayload
  ): Promise<PaqarCreateOrderResponse> {
    const { data } = await this.request<PaqarCreateOrderResponse>(
      "POST",
      "/orders",
      payload,
      undefined,
      { idempotent: false }
    );
    if (!data) throw new Error("PAQ.AR createOrder: respuesta vacía");
    return data;
  }

  /** Crea N órdenes en paralelo (una por bulto). */
  async createOrders(
    payloads: PaqarCreateOrderPayload[]
  ): Promise<PaqarCreateOrderResponse[]> {
    return Promise.all(payloads.map((p) => this.createOrder(p)));
  }

  /** PATCH /orders/{tn}/cancel — cancela una preimposición. */
  async cancelOrder(trackingNumber: string): Promise<PaqarCancelResponse> {
    const { data } = await this.request<PaqarCancelResponse>(
      "PATCH",
      `/orders/${encodeURIComponent(trackingNumber)}/cancel`
    );
    if (!data) throw new Error("PAQ.AR cancelOrder: respuesta vacía");
    return data;
  }

  /**
   * POST /labels — rótulos PDF base64 para N trackings.
   * labelFormat: "10x15" | "label" | undefined.
   */
  async getLabels(
    items: PaqarLabelRequest[],
    labelFormat?: "10x15" | "label"
  ): Promise<PaqarLabelResponse[]> {
    const { data } = await this.request<PaqarLabelResponse[]>(
      "POST",
      "/labels",
      items,
      labelFormat ? { labelFormat } : undefined
    );
    if (!data) throw new Error("PAQ.AR getLabels: respuesta vacía");
    return data;
  }

  /**
   * GET /tracking — historial de uno o más trackings.
   *
   * CA espera los TNs como query param `trackingNumbers` (no body), aunque
   * el manual muestra un ejemplo con array en body que fetch no permite en
   * GET. La forma que funciona es `?trackingNumbers=tn1&trackingNumbers=tn2`.
   */
  async getTracking(
    trackingNumbers: string[],
    extClient?: string
  ): Promise<PaqarTrackingResponse[]> {
    if (!this.isConfigured()) {
      throw new Error(
        "PAQ.AR no está configurado. Faltan PAQAR_API_KEY o PAQAR_AGREEMENT en env."
      );
    }
    const url = new URL(`${this.config.baseUrl}/tracking`);
    for (const tn of trackingNumbers) {
      url.searchParams.append("trackingNumbers", tn);
    }
    if (extClient) url.searchParams.set("extClient", extClient);

    const data = await withRetry("GET /tracking", async () => {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          authorization: `Apikey ${this.config.apiKey}`,
          agreement: this.config.agreement,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try { parsed = JSON.parse(text); } catch { parsed = text; }
      }
      if (!res.ok) {
        throw new PaqarApiException(res.status, (parsed as PaqarApiError) ?? text, "/tracking");
      }
      return parsed as PaqarTrackingResponse[];
    });
    if (!data) throw new Error("PAQ.AR getTracking: respuesta vacía");
    return data;
  }

  /**
   * POST /rates — cotización online (endpoint no documentado en manual v2,
   * descubierto por ingeniería inversa 2026-04-20). Ver docs/paqar-integration.md §Rates.
   */
  async getRates(req: Omit<PaqarRateRequest, "agreement">): Promise<PaqarRate[]> {
    const body: PaqarRateRequest = { agreement: this.config.agreement, ...req };
    const { data } = await this.request<PaqarRateResponse>("POST", "/rates", body);
    if (!data?.rates) throw new Error("PAQ.AR getRates: respuesta vacía");
    return data.rates;
  }

  /**
   * ¿Está caído Correo Argentino ahora mismo?
   *
   * Sirve para distinguir "el pedido tiene un dato inválido" de "el proveedor
   * no está respondiendo", que es la diferencia entre avisar a un humano y
   * dejar que el reintento haga su trabajo.
   *
   * Se pregunta por `/agencies` y no por `/auth`: durante la caída del
   * 2026-08-18 `/auth` seguía devolviendo 204 mientras `/agencies` devolvía
   * `500 I/O error: No route to host`. El que se cae es un servicio interno
   * suyo, aguas abajo del que valida credenciales.
   *
   * Nunca lanza: si no se puede saber, devuelve false (o sea, "no culpes al
   * proveedor sin pruebas").
   */
  async isProviderDown(): Promise<boolean> {
    try {
      await this.request<PaqarAgency[]>("GET", "/agencies", undefined, { stateId: "C" }, {
        idempotent: false, // sin reintentos: es un diagnóstico, tiene que ser rápido
      });
      return false;
    } catch (err) {
      if (err instanceof PaqarApiException) return err.status >= 500;
      return err instanceof Error; // timeout o conexión cortada
    }
  }

  /** GET /agencies — sucursales habilitadas para el acuerdo. */
  async getAgencies(filters?: {
    stateId?: string;
    pickup_availability?: boolean;
    package_reception?: boolean;
  }): Promise<PaqarAgency[]> {
    const { data } = await this.request<PaqarAgency[]>(
      "GET",
      "/agencies",
      undefined,
      filters
    );
    if (!data) throw new Error("PAQ.AR getAgencies: respuesta vacía");
    return data;
  }
}

export const paqarClient = new PaqarClient();
