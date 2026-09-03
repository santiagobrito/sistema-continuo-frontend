/**
 * POST /api/mercadopago/webhook
 *
 * MercadoPago IPN webhook. Actualiza estado WC y, si el pago fue aprobado
 * y el método de envío es Correo Argentino, dispara la creación de N órdenes
 * en PAQ.AR vía /api/paqar/create-orders.
 *
 * Flujo para Correo:
 *   1. MP notifica pago aprobado → WC order pasa a "processing".
 *   2. Leemos la order para ver meta _sc_shipping_method_id y _sc_paqar_agency_id.
 *   3. Si es correo_domicilio o correo_sucursal, POST a /api/paqar/create-orders
 *      que crea N órdenes en Correo y guarda los trackingNumbers en WC meta.
 *
 * Idempotencia: /api/paqar/create-orders podría disparse dos veces si MP reenvía.
 * Futura mejora: chequear meta `_sc_paqar_created_at` antes de crear.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPayment, getMerchantOrder, type MPPayment } from "@/lib/mercadopago/sdk";
import { record as debugRecord } from "@/lib/_debug-buffer";
import crypto from "crypto";
import { paqarClient } from "@/lib/paqar/client";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "";
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";

/**
 * Valida la firma HMAC del webhook de MercadoPago.
 *
 * MP manda dos headers:
 *   x-signature: "ts=<timestamp>,v1=<hash_hex>"
 *   x-request-id: <uuid>
 *
 * Template que firma MP (documentado en Checkout Pro → Webhooks):
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * HMAC-SHA256(template, MP_WEBHOOK_SECRET).hex() === v1
 *
 * data.id viene del QUERY STRING de la request (MP siempre lo manda ahí para
 * este propósito), caemos al body si no está.
 *
 * Si MP_WEBHOOK_SECRET no está configurado, loguea warning y acepta (útil en
 * dev, pero en prod DEBE estar).
 */
function validateMpSignature(
  request: NextRequest,
  body: { data?: { id?: string | number } }
): { ok: boolean; reason?: string } {
  if (!MP_WEBHOOK_SECRET) {
    // En producción, sin secret = vulnerabilidad crítica. El warning se loggea
    // PROMINENTEMENTE pero seguimos aceptando para no romper webhooks reales
    // mientras Santi no haya seteado el secret en panel MP + env.
    //
    // BLOQUEAR esto requiere acción de Santi:
    //   1. MercadoPago panel → Webhooks → activar firma + copiar secret
    //   2. EasyPanel → frontend service → env MP_WEBHOOK_SECRET=<copia>
    //   3. EasyPanel → frontend → env MP_WEBHOOK_REQUIRE_SIGNATURE=1
    if (process.env.MP_WEBHOOK_REQUIRE_SIGNATURE === "1") {
      console.error("[MP webhook] CRÍTICO: MP_WEBHOOK_REQUIRE_SIGNATURE=1 pero MP_WEBHOOK_SECRET vacío. Rechazando.");
      return { ok: false, reason: "secret-required-but-not-set" };
    }
    console.warn("[MP webhook] ⚠ INSEGURO: MP_WEBHOOK_SECRET no configurado, webhook acepta sin firma");
    return { ok: true, reason: "no-secret-warn" };
  }

  const xSignature = request.headers.get("x-signature") || "";
  const xRequestId = request.headers.get("x-request-id") || "";
  if (!xSignature || !xRequestId) {
    return { ok: false, reason: "missing-headers" };
  }

  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k === "ts") ts = v;
    if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return { ok: false, reason: "malformed-signature" };

  const dataId =
    request.nextUrl.searchParams.get("data.id") ||
    (body?.data?.id ? String(body.data.id) : "");

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) {
      console.error("[MP webhook DEBUG] length-mismatch:", {
        manifest, expected_len: a.length, received_len: b.length,
        expected_first8: expected.slice(0, 8), v1_first8: v1.slice(0, 8),
      });
      return { ok: false, reason: "length-mismatch" };
    }
    const match = crypto.timingSafeEqual(a, b);
    if (!match) {
      const dbg = {
        manifest,
        dataIdSource: request.nextUrl.searchParams.get("data.id") ? "querystring" : "body",
        dataId,
        xRequestId,
        ts,
        expected_first16: expected.slice(0, 16),
        received_first16: v1.slice(0, 16),
        secret_len: MP_WEBHOOK_SECRET.length,
        secret_first4: MP_WEBHOOK_SECRET.slice(0, 4),
        secret_last4: MP_WEBHOOK_SECRET.slice(-4),
        // also log all headers and query for full context
        allHeaders: Object.fromEntries(request.headers.entries()),
        queryString: request.nextUrl.searchParams.toString(),
      };
      console.error("[MP webhook DEBUG] hmac-mismatch:", dbg);
      debugRecord("mp-webhook-mismatch", dbg);
    }
    return match ? { ok: true } : { ok: false, reason: "hmac-mismatch" };
  } catch (err) {
    console.error("[MP webhook DEBUG] hex-parse-error:", err);
    return { ok: false, reason: "hex-parse-error" };
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  visa: "Visa",
  master: "Mastercard",
  amex: "American Express",
  cabal: "Cabal",
  naranja: "Naranja",
  argencard: "Argencard",
  diners: "Diners",
  maestro: "Maestro",
  debvisa: "Visa Débito",
  debmaster: "Mastercard Débito",
  debcabal: "Cabal Débito",
  account_money: "Dinero en cuenta MP",
  rapipago: "Rapipago",
  pagofacil: "Pago Fácil",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito",
  ticket: "Efectivo",
  bank_transfer: "Transferencia",
  atm: "Cajero",
  account_money: "Dinero en cuenta",
  digital_wallet: "Billetera digital",
};

function formatArs(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(amount);
}

function buildMpMeta(payment: MPPayment): Array<{ key: string; value: string }> {
  const meta: Array<{ key: string; value: string }> = [
    { key: "_mp_payment_id", value: String(payment.id) },
    { key: "_mp_status", value: payment.status || "" },
    { key: "_mp_status_detail", value: payment.status_detail || "" },
    { key: "_mp_payment_method", value: payment.payment_method_id || "" },
    { key: "_mp_payment_type", value: payment.payment_type_id || "" },
    { key: "_mp_installments", value: String(payment.installments ?? 1) },
    { key: "_mp_transaction_amount", value: String(payment.transaction_amount ?? 0) },
    { key: "_mp_net_amount", value: String(payment.net_amount ?? payment.transaction_details?.net_received_amount ?? payment.transaction_amount ?? 0) },
    { key: "_mp_currency", value: payment.currency_id || "ARS" },
    { key: "_mp_date_approved", value: payment.date_approved || "" },
    { key: "_mp_date_created", value: payment.date_created || "" },
    { key: "_mp_authorization_code", value: payment.authorization_code || "" },
    { key: "_mp_statement_descriptor", value: payment.statement_descriptor || "" },
  ];

  if (payment.card) {
    if (payment.card.last_four_digits) meta.push({ key: "_mp_card_last_four", value: payment.card.last_four_digits });
    if (payment.card.first_six_digits) meta.push({ key: "_mp_card_first_six", value: payment.card.first_six_digits });
    if (payment.card.cardholder?.name) meta.push({ key: "_mp_cardholder_name", value: payment.card.cardholder.name });
    if (payment.card.cardholder?.identification?.number) {
      meta.push({ key: "_mp_cardholder_doc", value: `${payment.card.cardholder.identification.type || ""} ${payment.card.cardholder.identification.number}`.trim() });
    }
  }

  if (payment.fee_details?.length) {
    const totalFees = payment.fee_details.reduce((s, f) => s + (f.amount || 0), 0);
    meta.push({ key: "_mp_fee_total", value: String(totalFees) });
  }

  if (payment.transaction_details?.installment_amount) {
    meta.push({ key: "_mp_installment_amount", value: String(payment.transaction_details.installment_amount) });
  }

  return meta;
}

function buildMpNote(payment: MPPayment): string {
  const lines: string[] = [];
  lines.push(`MercadoPago — Transacción #${payment.id}`);
  lines.push(`Estado: ${payment.status}${payment.status_detail ? ` (${payment.status_detail})` : ""}`);

  const methodLabel = PAYMENT_METHOD_LABELS[payment.payment_method_id || ""] || payment.payment_method_id || "—";
  const typeLabel = PAYMENT_TYPE_LABELS[payment.payment_type_id || ""] || payment.payment_type_id || "";
  lines.push(`Método: ${methodLabel}${typeLabel ? ` (${typeLabel})` : ""}`);

  if (payment.card?.last_four_digits) {
    const holder = payment.card.cardholder?.name ? ` — titular ${payment.card.cardholder.name}` : "";
    lines.push(`Tarjeta: •••• ${payment.card.last_four_digits}${holder}`);
  }

  if ((payment.installments ?? 1) > 1) {
    const instAmt = payment.transaction_details?.installment_amount;
    lines.push(`Cuotas: ${payment.installments}${instAmt ? ` × ${formatArs(instAmt)}` : ""}`);
  }

  lines.push(`Monto cobrado: ${formatArs(payment.transaction_amount)}`);

  const fees = payment.fee_details?.reduce((s, f) => s + (f.amount || 0), 0) || 0;
  if (fees > 0) {
    lines.push(`Comisión MP: ${formatArs(fees)}`);
  }
  const net = payment.net_amount ?? payment.transaction_details?.net_received_amount;
  if (net !== undefined) {
    lines.push(`Neto recibido: ${formatArs(net)}`);
  }

  if (payment.authorization_code) {
    lines.push(`Código autorización: ${payment.authorization_code}`);
  }
  if (payment.date_approved) {
    lines.push(`Aprobado: ${new Date(payment.date_approved).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`);
  }

  return lines.join("\n");
}

async function addOrderNote(orderId: string, note: string): Promise<void> {
  try {
    await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${WC_API_AUTH}`,
      },
      body: JSON.stringify({ note, customer_note: false }),
    });
  } catch (err) {
    console.error("[MP webhook] failed to add order note:", err);
  }
}

async function updateOrderStatus(orderId: string, status: string, payment?: MPPayment): Promise<void> {
  const body: Record<string, unknown> = { status };

  if (payment) {
    body.transaction_id = String(payment.id);
    body.meta_data = buildMpMeta(payment);
    if (payment.payment_method_id) {
      body.payment_method_title = PAYMENT_METHOD_LABELS[payment.payment_method_id] || payment.payment_method_id;
    }
  }

  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
    },
    body: JSON.stringify(body),
  });

  // Only add the detailed note when the payment is a terminal state; avoids
  // spamming notes every time MP sends an update.
  if (payment && (payment.status === "approved" || payment.status === "rejected" || payment.status === "refunded")) {
    await addOrderNote(orderId, buildMpNote(payment));
  }
}

interface WcOrderMeta {
  id: number;
  /** Total de la orden según WC — el número contra el que se concilia el pago. */
  total?: string;
  /** Status actual en WooCommerce: decide si la orden ya salió del circuito de
   *  cobro y por lo tanto un webhook tardío no puede tocarla. */
  status?: string;
  meta_data?: Array<{ key: string; value: string }>;
}

async function getOrderMeta(orderId: string): Promise<WcOrderMeta | null> {
  const r = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: `Basic ${WC_API_AUTH}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

function readMeta(meta: WcOrderMeta | null, key: string): string | undefined {
  return meta?.meta_data?.find((m) => m.key === key)?.value;
}

async function triggerPaqarCreate(orderId: string, shippingMethod: string, agencyId?: string) {
  if (!SITE_URL || !INTERNAL_SECRET) {
    console.warn("[MP webhook] Falta SITE_URL o INTERNAL_API_SECRET — skip PAQ.AR create");
    await reportPaqarFailure(orderId, "Configuración faltante (SITE_URL/INTERNAL_API_SECRET)");
    return;
  }

  const deliveryType = shippingMethod === "correo_sucursal" ? "agency" : "homeDelivery";

  let detail = "";
  try {
    const res = await fetch(`${SITE_URL}/api/paqar/create-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify({ orderId: Number(orderId), deliveryType, agencyId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      detail = `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`;
      console.error(`[MP webhook] PAQ.AR create fail ${res.status} order ${orderId}:`, data);
      await reportPaqarFailure(orderId, detail);
      return;
    }
    if (data.partial) {
      // Multi-bundle parcial — algunos TNs OK, otros fallaron
      detail = `Parcial: ${data.failed?.length || 0} de ${data.bundles} bultos fallaron`;
      console.warn(`[MP webhook] PAQ.AR partial order ${orderId}:`, data);
      await reportPaqarFailure(orderId, detail);
      return;
    }
    console.log(`[MP webhook] PAQ.AR ok, ${data.bundles} bultos`, data.trackings);
  } catch (err) {
    detail = err instanceof Error ? err.message : String(err);
    console.error("[MP webhook] PAQ.AR create error:", err);
    await reportPaqarFailure(orderId, detail);
  }
}

/**
 * Cuando la auto-creación falla, dejamos rastro visible:
 *  - Meta `_sc_paqar_autocreate_failed_at`, que es lo que barre el cron
 *    `paqar-retry-pendientes` para reintentar solo
 *  - Nota interna en la orden (visible en WP admin)
 *  - Email a admin, PERO solo pidiendo acción manual cuando de verdad hace falta
 *
 * La distinción importa: si el que está caído es Correo Argentino, el metabox de
 * WP admin pega contra el mismo endpoint y falla igual. Un aviso que manda a
 * hacer algo que no puede funcionar entrena a ignorar los avisos. Incidente del
 * 2026-08-18 (orden #18214).
 */
async function reportPaqarFailure(orderId: string, detail: string): Promise<void> {
  const proveedorCaido = await paqarClient.isProviderDown().catch(() => false);

  // Marca para el reintento automático. Sin esto el cron no sabe qué órdenes
  // debía haber creado el webhook y no puede distinguirlas de las que el equipo
  // despacha por otro canal.
  await markPaqarAutocreateFailed(orderId, detail).catch(() => {});

  const causa = proveedorCaido
    ? "Correo Argentino no está respondiendo (no es el pedido)"
    : detail;
  const noteText = proveedorCaido
    ? `⚠️ [PAQ.AR] Auto-creación falló porque Correo Argentino no responde: ${detail}\nNO hace falta hacer nada: se reintenta solo cada 15 min.`
    : `⚠️ [PAQ.AR] Auto-creación falló: ${detail}\nNecesita generación manual desde el panel Correo Argentino.`;
  await addOrderNote(orderId, noteText);

  const subject = proveedorCaido
    ? `⏳ PAQ.AR caído — orden #${orderId} en cola de reintento`
    : `⚠️ PAQ.AR auto-create falló — orden #${orderId}`;
  const accion = proveedorCaido
    ? `<p><strong>No hay que hacer nada.</strong> El que está caído es Correo Argentino, así que generar la etiqueta a mano desde el metabox falla igual: es el mismo endpoint. El reintento automático corre cada 15 min y avisa si a las 3 h sigue sin salir.</p>`
    : `<p>Acción: abrir el pedido en WP admin → metabox PAQ.AR → generar etiqueta manual.</p>`;
  const body = `<p>La auto-creación de la etiqueta PAQ.AR falló para la orden <a href="https://api.sistemacontinuo.com.ar/wp-admin/post.php?post=${orderId}&action=edit"><strong>#${orderId}</strong></a>.</p><p><strong>Causa:</strong> ${causa}</p><p><strong>Detalle:</strong> ${detail}</p>${accion}`;
  // Fire and forget — el alert es nice-to-have, no bloquea el webhook
  fetch(`${WP_URL}/wp-json/sistema-continuo/v1/admin-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
    },
    body: JSON.stringify({ subject, body }),
  }).catch(() => {});
}

/**
 * Tolerancia de conciliación entre transaction_amount de MP y el total de la
 * orden WC. ±1 peso: ARS opera sin decimales en catálogo, pero el armado de la
 * preferencia redondea por unidad y puede mover centavos; una manipulación
 * real del importe es de pesos enteros y grandes, nunca de 1 peso. (2026-09-01)
 */
const MP_AMOUNT_TOLERANCE_ARS = 1;

/**
 * Statuses en los que la orden YA salio del circuito de cobro: hay mercaderia
 * en la calle o entregada. Un webhook tardio de MP no puede devolverlas a
 * on-hold: el pago ya se valido cuando correspondia, y degradarlas rompe los
 * reportes y le manda al cliente un email que contradice lo que recibio.
 *
 * Incidente (orden #18398, 3-9-2026): MP reenvio el webhook de un pago del
 * 24/8 y la conciliacion paso a "En espera" una orden ENTREGADA el 28/8.
 */
const ESTADOS_YA_DESPACHADOS = ["shipped", "completed"];
// A propósito NO incluye "cancelled" ni "refunded": ahí un pago aprobado que
// llega tarde es una anomalía que hay que ver, no algo para tragarse en
// silencio, y ese caso no se analizó en el incidente de #18398.

/**
 * Lo realmente pagado por la orden, sumando TODOS los pagos aprobados.
 *
 * No alcanza con `payment.transaction_amount`: Checkout Pro permite pagar con
 * dos medios a la vez (dinero en cuenta + tarjeta) y entonces ningun pago
 * individual llega al total. La merchant_order agrupa esos pagos.
 *
 * Devuelve `null` si no se pudo averiguar, y el que llama trata ese caso como
 * "no conciliado" (fail closed): preferimos retener de mas que despachar sin
 * cobrar.
 */
async function totalPagado(payment: MPPayment): Promise<number | null> {
  const moId = payment.order?.id;
  if (moId) {
    const mo = await getMerchantOrder(String(moId));
    if (mo) {
      // paid_amount ya viene neto de la propia MO; si falta, se suman los pagos
      // aprobados a mano. Los rechazados NO cuentan.
      if (typeof mo.paid_amount === "number" && Number.isFinite(mo.paid_amount)) {
        return mo.paid_amount - (mo.refunded_amount || 0);
      }
      if (Array.isArray(mo.payments)) {
        return mo.payments
          .filter((p) => p.status === "approved")
          .reduce((acc, p) => acc + (p.transaction_amount || 0), 0);
      }
    }
  }
  // Sin merchant_order (pago suelto) el unico dato es el del propio pago.
  return typeof payment.transaction_amount === "number" ? payment.transaction_amount : null;
}

/**
 * Pago aprobado cuyo monto NO coincide con el total de la orden: la orden se
 * retuvo en on-hold sin disparar despacho. Deja nota interna + email admin.
 * Reusa el endpoint admin-alert del plugin (SC_Admin_Alert), igual que
 * reportPaqarFailure de arriba.
 */
async function reportAmountMismatch(
  orderId: string,
  paid: number | undefined,
  orderTotal: number | undefined,
  paymentId: string
): Promise<void> {
  const paidTxt = paid !== undefined ? formatArs(paid) : "(desconocido)";
  const totalTxt = orderTotal !== undefined ? formatArs(orderTotal) : "(no se pudo leer la orden)";
  await addOrderNote(
    orderId,
    `🛑 [Conciliación MP] Pago #${paymentId} aprobado por ${paidTxt}, pero el total de la orden es ${totalTxt}.\n` +
      `La orden quedó en "En espera" y NO se disparó el despacho.\n` +
      `Verificar en el panel de MercadoPago cuánto entró de verdad antes de procesarla; si el monto cobrado es menor al total, NO despachar sin resolver la diferencia.`
  );
  const subject = `🛑 Pago MP retenido — orden #${orderId}: cobrado ${paidTxt}, orden ${totalTxt}`;
  const body =
    `<p>MercadoPago aprobó el pago <strong>#${paymentId}</strong> por <strong>${paidTxt}</strong>, ` +
    `pero el total de la orden <a href="https://api.sistemacontinuo.com.ar/wp-admin/post.php?post=${orderId}&action=edit"><strong>#${orderId}</strong></a> es <strong>${totalTxt}</strong>.</p>` +
    `<p>La orden quedó en <strong>En espera (on-hold)</strong> y no se generó etiqueta de envío.</p>` +
    `<p>Acción: verificar en el panel de MercadoPago el monto realmente acreditado. Si coincide con el total de la orden, pasarla a Procesando a mano. Si es menor, es un intento de pagar de menos (o un bug de precios): no despachar sin resolverlo.</p>`;
  // Fire and forget — el alert es nice-to-have, no bloquea el webhook.
  fetch(`${WP_URL}/wp-json/sistema-continuo/v1/admin-alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
    },
    body: JSON.stringify({ subject, body }),
  }).catch(() => {});
}

/** Deja la orden en la cola del cron de reintento. */
async function markPaqarAutocreateFailed(orderId: string, detail: string): Promise<void> {
  await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
    },
    body: JSON.stringify({
      meta_data: [
        { key: "_sc_paqar_autocreate_failed_at", value: new Date().toISOString() },
        { key: "_sc_paqar_autocreate_error", value: detail.slice(0, 300) },
      ],
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sig = validateMpSignature(request, body);
    if (!sig.ok) {
      console.warn(`[MP webhook] firma inválida (${sig.reason})`);
      // Si el flag está activo, rechazar. Si no, aceptar pero loggear.
      // La defensa en profundidad: el handler igual consulta MP API con
      // nuestro access token para validar el pago antes de procesar, así
      // un webhook fake con payment_id inventado no afecta nada.
      if (process.env.MP_WEBHOOK_REQUIRE_SIGNATURE === "1") {
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
      console.warn(`[MP webhook] aceptando sin firma válida (REQUIRE_SIGNATURE=0). Razón: ${sig.reason}`);
    }

    if (body.type === "payment" && body.data?.id) {
      const payment = await getPayment(String(body.data.id));
      const orderId = payment.external_reference;

      if (!orderId) return NextResponse.json({ ok: true });

      // Idempotencia: MP reintenta webhooks. Si ya registramos este payment_id
      // con el mismo status, no hacemos nada (ni update, ni nota duplicada).
      const currentMeta = await getOrderMeta(orderId);
      const savedPaymentId = readMeta(currentMeta, "_mp_payment_id");
      const savedStatus = readMeta(currentMeta, "_mp_status");
      if (savedPaymentId === String(payment.id) && savedStatus === payment.status) {
        return NextResponse.json({ ok: true, skipped: "duplicate" });
      }

      // Anti-regresión de status. MP a veces manda webhooks delayed: llega un evento viejo
      // (status anterior) DESPUÉS de uno nuevo. Comparamos el timestamp del payment con el
      // último que registramos y rechazamos los más viejos.
      // También bloqueamos transiciones lógicamente regresivas (approved → pending) cuando
      // hay shipping ya disparado (no podemos "des-aprobar" un pago que ya generó etiqueta).
      const savedDate = readMeta(currentMeta, "_mp_date_created");
      const incomingDate = payment.date_last_updated || payment.date_created || "";
      if (savedDate && incomingDate && new Date(incomingDate) < new Date(savedDate)) {
        console.warn(
          `[MP webhook] Webhook con timestamp viejo ignorado: incoming ${incomingDate} < saved ${savedDate} (order ${orderId})`
        );
        return NextResponse.json({ ok: true, skipped: "stale_event" });
      }
      // Una orden ya despachada o entregada no vuelve atrás por un webhook
      // tardío. MP reenvía notificaciones de pagos viejos y, sin esto, la
      // conciliación de abajo degradaba pedidos que el cliente ya recibió.
      const wcStatus = String(currentMeta?.status ?? "");
      if (ESTADOS_YA_DESPACHADOS.includes(wcStatus)) {
        console.warn(
          `[MP webhook] Orden ${orderId} ya está en '${wcStatus}': se ignora el evento ${payment.status} del pago ${payment.id}`
        );
        return NextResponse.json({ ok: true, skipped: "already_shipped" });
      }

      // Bloqueo regresión cuando ya estamos en flujo logístico
      const PROTECTED_FROM_REGRESSION: Record<string, string[]> = {
        // Si llegamos aquí, NO permitimos pasar a estos statuses MP regresivos
        approved: ["pending", "in_process"],
        // Si la orden ya está en processing/shipped/completed por otro motivo, ignoramos pending
      };
      if (savedStatus && PROTECTED_FROM_REGRESSION[savedStatus]?.includes(payment.status)) {
        console.warn(
          `[MP webhook] Regresión bloqueada: ${savedStatus} → ${payment.status} (order ${orderId})`
        );
        return NextResponse.json({ ok: true, skipped: "regression_blocked" });
      }

      switch (payment.status) {
        case "approved": {
          // Conciliación (2026-09-01, defensa en profundidad): el monto que MP
          // aprobó tiene que coincidir con el total de la orden ANTES de
          // marcarla pagada y despachar. Sin esto, una preferencia manipulada
          // (o cualquier bug de pricing nuestro) pagaba lo que quería y la
          // orden salía a despacho igual. Funciona aunque el armado de la
          // preferencia esté roto: acá se compara contra la orden real.
          // Si no se puede leer el total → también se retiene (fail closed).
          const orderTotal = parseFloat(String(currentMeta?.total ?? ""));
          // Se concilia contra la SUMA de los pagos aprobados de la compra, no
          // contra este pago suelto: con pago mixto (dinero en cuenta + tarjeta)
          // ninguno de los dos llega al total por separado.
          const paid = await totalPagado(payment);
          const reconciled =
            Number.isFinite(orderTotal) &&
            typeof paid === "number" &&
            Math.abs(paid - orderTotal) <= MP_AMOUNT_TOLERANCE_ARS;
          if (!reconciled) {
            console.error(
              `[MP webhook] Conciliación FALLÓ orden ${orderId}: MP cobró ${paid ?? "?"}, la orden vale ${Number.isFinite(orderTotal) ? orderTotal : "(ilegible)"} — se retiene en on-hold sin despacho`
            );
            // updateOrderStatus registra igual el payment_id/status en meta:
            // así la idempotencia de arriba corta los reintentos de MP y no se
            // duplican notas ni alertas por el mismo pago.
            await updateOrderStatus(orderId, "on-hold", payment);
            await reportAmountMismatch(
              orderId,
              paid ?? undefined,
              Number.isFinite(orderTotal) ? orderTotal : undefined,
              String(payment.id)
            );
            break;
          }
          await updateOrderStatus(orderId, "processing", payment);
          {
            const shippingMethod = readMeta(currentMeta, "_sc_shipping_method_id");
            const agencyId = readMeta(currentMeta, "_sc_paqar_agency_id");
            const alreadyCreated = readMeta(currentMeta, "_sc_paqar_created_at");
            if (
              !alreadyCreated &&
              shippingMethod &&
              (shippingMethod === "correo_domicilio" || shippingMethod === "correo_sucursal")
            ) {
              triggerPaqarCreate(orderId, shippingMethod, agencyId).catch(() => {});
            }
          }
          break;
        }
        case "rejected":
          await updateOrderStatus(orderId, "failed", payment);
          break;
        case "cancelled":
          // El cliente canceló el pago en MP (cerró el modal estando en flujo, o canceló desde su cuenta).
          // No es failed — no es que falló, es que renunció. Quedaba en pending huérfano hasta que el
          // cron lo barría. Ahora pasa a cancelled inmediato. Restaura stock y limpia reportes.
          await updateOrderStatus(orderId, "cancelled", payment);
          break;
        case "pending":
        case "in_process":
          await updateOrderStatus(orderId, "on-hold", payment);
          break;
        case "refunded":
          await updateOrderStatus(orderId, "refunded", payment);
          break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json({ ok: true }); // Always 200 to avoid MP retries
  }
}
