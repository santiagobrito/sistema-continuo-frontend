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

  private async request<T>(
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

  /** GET /auth — valida credenciales. Éxito: 204 No Content. */
  async auth(): Promise<boolean> {
    const { status } = await this.request<never>("GET", "/auth");
    return status === 204;
  }

  /** POST /orders — crea una orden (un bulto). */
  async createOrder(
    payload: PaqarCreateOrderPayload
  ): Promise<PaqarCreateOrderResponse> {
    const { data } = await this.request<PaqarCreateOrderResponse>(
      "POST",
      "/orders",
      payload
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

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        authorization: `Apikey ${this.config.apiKey}`,
        agreement: this.config.agreement,
      },
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch { parsed = text; }
    }
    if (!res.ok) {
      throw new PaqarApiException(res.status, (parsed as PaqarApiError) ?? text, "/tracking");
    }
    const data = parsed as PaqarTrackingResponse[];
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
