/**
 * POST /api/orders/create
 *
 * Creates a WooCommerce order for non-MercadoPago payment methods
 * (transferencia bancaria, efectivo en local).
 * Returns order ID for confirmation page.
 */

import { NextRequest, NextResponse } from "next/server";
import { markCartRecovered, subscribeNewsletter } from "@/lib/brevo/client";
import { getSession } from "@/lib/auth/session";
import { getCustomerByEmail, createCustomer, syncCustomerFromCheckout } from "@/lib/auth/wc-api";
import {
  attributionToOrderMeta,
  type OrderAttributionInput,
} from "@/lib/wordpress/order-attribution";
import { resolveCoupon, applyDiscountToItems } from "@/lib/woocommerce/coupons";
import { computeShippingCost, splitItemsFromOrder } from "@/lib/paqar/quote-service";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

function shippingMethodTitle(method: string | undefined): string {
  switch (method) {
    case "local_pickup":       return "Retiro en local";
    case "correo_domicilio":   return "Correo Argentino a domicilio";
    case "correo_sucursal":    return "Correo Argentino a sucursal";
    case "moto_z1":            return "Moto CABA (Zona 1)";
    case "moto_z2":            return "Moto GBA Zona 2";
    case "moto_z3":            return "Moto GBA Zona 3";
    case "moto_z4":            return "Moto GBA Zona 4";
    case "moto_caba":          return "Moto CABA";
    case "moto_gba1":          return "Moto GBA Zona 1";
    case "moto_gba2":          return "Moto GBA Zona 2";
    case "transporte":         return "Transporte al interior";
    default:                   return "Envío";
  }
}

interface OrderBody {
  items: { product_id: number; variation_id?: number; name: string; quantity: number; price: number }[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dni_cuit?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  shipping_method?: string;
  /** Envío SIN bonificar. El descuento por envío gratis se calcula acá. */
  shipping_cost?: number;
  /** Lo que el checkout le mostró al cliente, solo para detectar desvíos. */
  shipping_cost_expected?: number;
  paqar_agency_id?: string;
  customer_note?: string;
  payment_method: "transferencia" | "efectivo";
  gclid?: string;
  coupon_code?: string;
  attribution?: OrderAttributionInput;
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderBody = await request.json();

    if (!body.items?.length) {
      return NextResponse.json({ error: "No hay productos" }, { status: 400 });
    }
    // Defensa en profundidad — mismas reglas que create-preference. Sin estos campos
    // no se puede facturar ni despachar (ver pedido #14676 que entró sin dirección).
    const b = body.billing || ({} as OrderBody["billing"]);
    const requiredAlways: Array<keyof OrderBody["billing"]> = ["first_name", "last_name", "email", "phone", "dni_cuit", "city", "state"];
    const missing: string[] = requiredAlways.filter((k) => !String(b[k] || "").trim());
    // address_1 y postcode SIEMPRE requeridos para facturación AFIP, sin
    // importar el método de envío (incluyendo correo_sucursal y local_pickup).
    // El destino del envío puede ser sucursal o local, pero los datos de
    // facturación son del comprador.
    // address_1 debe tener calle + número (no solo ciudad/provincia) — ver pedido
    // #15374 "Posadas Misiones" que pasó por falta de esta validación.
    const a1 = String(b.address_1 || "").trim();
    if (!a1) missing.push("address_1");
    else if (a1.length < 5 || !/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(a1) || !/\d/.test(a1)) missing.push("address_1 (debe incluir calle y número)");
    if (!String(b.postcode || "").trim()) missing.push("postcode");
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Faltan datos requeridos", missing },
        { status: 400 }
      );
    }

    // REGLA DE NEGOCIO: efectivo en local solo permite retiro en local.
    // Sino se generan órdenes incoherentes como #15058 (efectivo + Correo Argentino domicilio):
    // el cliente viene a pagar al local, no tiene sentido que también pidamos despacho.
    if (body.payment_method === "efectivo" && body.shipping_method !== "local_pickup") {
      return NextResponse.json(
        {
          error: "El pago en efectivo solo es compatible con retiro en local. Si necesitás envío a domicilio, elegí transferencia o MercadoPago.",
          field: "payment_method",
        },
        { status: 400 }
      );
    }

    const paymentTitles: Record<string, string> = {
      transferencia: "Transferencia Bancaria",
      efectivo: "Pago y retiro en local",
    };

    // Asociar al customer WC si hay sesión; sino buscar por email; sino crear uno.
    // Política: todo pedido debe quedar asociado a un customer, nada de guest orders.
    let customerId: number | undefined;
    let userCreatedAtCheckout = false; // si creamos cuenta ahora → el backend manda email "Tu cuenta lista"
    const session = await getSession();
    if (session?.id) {
      customerId = session.id;
    } else if (body.billing?.email) {
      const existing = await getCustomerByEmail(body.billing.email);
      if (existing?.id) {
        customerId = existing.id;
      } else {
        const created = await createCustomer({
          email: body.billing.email,
          first_name: body.billing.first_name,
          last_name: body.billing.last_name,
        });
        if (created?.id) {
          customerId = created.id;
          userCreatedAtCheckout = true;
        }
      }
    }

    // Hardening: si el método es transporte al interior, exigir customer_note
    // (empresa de transporte + terminal). Sin ese dato el equipo no puede despachar.
    if (body.shipping_method === "transporte" && !String(body.customer_note || "").trim()) {
      return NextResponse.json(
        { error: "Para transporte al interior necesitamos la empresa de transporte y terminal de destino.", field: "customer_note" },
        { status: 400 }
      );
    }

    // Resolver cupón y prorratear descuento. WC REST no aplica coupon_lines a
    // los totals automáticamente — hay que mandar line_items con subtotal/total
    // explícitos y discount_total a mano para que el descuento se persista.
    const subtotalForCoupon = body.items.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const resolved = body.coupon_code
      ? await resolveCoupon(body.coupon_code, subtotalForCoupon, body.billing.email)
      : null;
    const discountTotal = resolved?.discount_amount || 0;
    const itemsAfter = discountTotal > 0 ? applyDiscountToItems(body.items, discountTotal) : null;

    // Envío gratis por producto/variación: el descuento se calcula acá, contra
    // WP, nunca con lo que diga el browser. body.shipping_cost llega sin
    // bonificar.
    const grossShipping = body.shipping_cost ?? 0;
    const { cost: shippingAfterFree, credit: shippingCredit } = await computeShippingCost({
      items: splitItemsFromOrder(body.items),
      destState: body.billing.state || "",
      destZip: body.billing.postcode || "",
      method: body.shipping_method || "",
      grossCost: grossShipping,
    });
    const effectiveShippingCost = resolved?.free_shipping ? 0 : shippingAfterFree;

    if (
      body.shipping_cost_expected !== undefined &&
      !resolved?.free_shipping &&
      body.shipping_cost_expected !== effectiveShippingCost
    ) {
      console.warn(
        `[orders/create] envío recalculado distinto al mostrado: cliente vio ${body.shipping_cost_expected}, se cobra ${effectiveShippingCost} (bruto ${grossShipping}, crédito ${shippingCredit})`
      );
    }

    const orderData: Record<string, unknown> = {
      status: body.payment_method === "efectivo" ? "on-hold" : "on-hold",
      customer_id: customerId || 0,
      customer_note: (body.customer_note || "").trim().slice(0, 300),
      billing: {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name,
        email: body.billing.email,
        phone: body.billing.phone,
        address_1: body.billing.address_1 || "",
        city: body.billing.city || "",
        state: body.billing.state || "",
        postcode: body.billing.postcode || "",
        country: "AR",
      },
      shipping: {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name,
        address_1: body.billing.address_1 || "",
        city: body.billing.city || "",
        state: body.billing.state || "",
        postcode: body.billing.postcode || "",
        country: "AR",
      },
      line_items: itemsAfter
        ? itemsAfter.map((item) => ({
            product_id: item.product_id,
            variation_id: item.variation_id || undefined,
            quantity: item.quantity,
            subtotal: String(item.line_subtotal_original),
            total: String(item.line_total_after),
          }))
        : body.items.map((item) => ({
            product_id: item.product_id,
            variation_id: item.variation_id || undefined,
            quantity: item.quantity,
          })),
      payment_method: body.payment_method,
      payment_method_title: paymentTitles[body.payment_method] || body.payment_method,
      set_paid: false,
      coupon_lines: body.coupon_code ? [{ code: body.coupon_code }] : [],
      discount_total: discountTotal > 0 ? String(discountTotal) : undefined,
      meta_data: [
        ...(body.gclid ? [{ key: "_gclid", value: body.gclid }] : []),
        ...(body.paqar_agency_id ? [{ key: "_sc_paqar_agency_id", value: body.paqar_agency_id }] : []),
        ...(body.shipping_method ? [{ key: "_sc_shipping_method_id", value: body.shipping_method }] : []),
        ...(body.billing.dni_cuit ? [{ key: "_dni_cuit", value: body.billing.dni_cuit }] : []),
        ...(userCreatedAtCheckout ? [{ key: "_sc_user_created_at_checkout", value: "1" }] : []),
        ...attributionToOrderMeta(body.attribution),
      ],
    };

    if (body.shipping_method && body.shipping_cost !== undefined) {
      orderData.shipping_lines = [
        {
          method_id: body.shipping_method,
          method_title: shippingMethodTitle(body.shipping_method),
          total: String(effectiveShippingCost),
        },
      ];
    }

    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${WC_API_AUTH}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WC order error: ${err.slice(0, 200)}`);
    }

    const order = await res.json();

    // Sincronizar datos al perfil del customer (para auto-fill en próximas compras)
    if (customerId) {
      syncCustomerFromCheckout(customerId, {
        first_name: body.billing.first_name,
        last_name: body.billing.last_name,
        email: body.billing.email,
        phone: body.billing.phone,
        dni_cuit: body.billing.dni_cuit,
        address_1: body.billing.address_1,
        city: body.billing.city,
        state: body.billing.state,
        postcode: body.billing.postcode,
      }).catch(() => {});
    }

    // Auto-subscribe + mark cart recovered
    markCartRecovered(body.billing.email).catch(() => {});
    subscribeNewsletter(body.billing.email, `${body.billing.first_name} ${body.billing.last_name}`).catch(() => {});

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number || String(order.id),
      paymentMethod: body.payment_method,
      total: order.total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Order create error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
