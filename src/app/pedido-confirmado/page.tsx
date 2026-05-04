import Link from "next/link";
import { GoogleCustomerReviews } from "./GoogleCustomerReviews";
import { ClearCartOnSuccess } from "./ClearCartOnSuccess";
import { PurchaseTracker } from "./PurchaseTracker";

// MP manda algunos query params duplicados (ej. status=approved dos veces)
// en back_urls, lo que Next.js entrega como string[]. Normalizamos a string.
type MaybeMulti = string | string[] | undefined;
interface Props {
  searchParams: Promise<Record<string, MaybeMulti>>;
}

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

function first(v: MaybeMulti): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

async function fetchWcOrderStatus(orderId: string): Promise<string | null> {
  if (!orderId || !WP_URL || !WC_API_AUTH) return null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: `Basic ${WC_API_AUTH}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.status || null;
  } catch {
    return null;
  }
}

interface WcOrderSlim {
  status: string;
  total: string;
  shipping_total?: string;
  line_items: { product_id: number; variation_id?: number; quantity: number; total: string; name: string }[];
  billing: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  coupon_lines?: { code: string }[];
}

async function fetchWcOrderFull(orderId: string): Promise<WcOrderSlim | null> {
  if (!orderId || !WP_URL || !WC_API_AUTH) return null;
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: `Basic ${WC_API_AUTH}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as WcOrderSlim;
  } catch {
    return null;
  }
}

export default async function OrderConfirmedPage({ searchParams }: Props) {
  const sp = await searchParams;
  const order = first(sp.order);
  const status = first(sp.status);
  const payment = first(sp.payment);
  const email = first(sp.email);
  const shipping = first(sp.shipping);

  // Si no vino status en la URL pero sí tenemos order_id, consultamos WC
  // (el modal MP a veces no transmite back_urls params al "Volver al sitio").
  // Si no pudimos derivar un status pero la order EXISTE, preferimos mostrar
  // "pendiente" (amarillo) antes que "rechazado" (rojo) — la order real vive
  // en WC, nunca mostrar error si la compra quedó registrada.
  let effectiveStatus = status;
  let orderFull: WcOrderSlim | null = null;
  if (order) {
    orderFull = await fetchWcOrderFull(order);
    if (!effectiveStatus && orderFull) {
      const wcStatus = orderFull.status;
      if (wcStatus === "processing" || wcStatus === "completed" || wcStatus === "preparing" || wcStatus === "sent-to-tactica" || wcStatus === "shipped" || wcStatus === "at-branch") {
        effectiveStatus = "approved";
      } else if (wcStatus === "failed" || wcStatus === "cancelled") {
        effectiveStatus = "rejected";
      } else if (wcStatus === "refunded") {
        effectiveStatus = "refunded";
      } else if (wcStatus) {
        effectiveStatus = "pending";
      }
    }
  }

  const isApproved = effectiveStatus === "approved";
  const isPending = effectiveStatus === "pending";
  const isRefunded = effectiveStatus === "refunded";
  const isTransferencia = payment === "transferencia";
  const isEfectivo = payment === "efectivo";

  // Vaciar el carrito si el pedido es válido. NO vaciar si el pago fue rechazado
  // (isRefunded / sin order): el user puede querer reintentar.
  const shouldClearCart = Boolean(order) && (isApproved || isPending || isTransferencia || isEfectivo);

  return (
    <main className="bg-gray-50 min-h-screen">
      <ClearCartOnSuccess shouldClear={shouldClearCart} />
      {order && orderFull && (isApproved || isPending || isTransferencia || isEfectivo) && (
        <PurchaseTracker
          orderId={order}
          total={parseFloat(orderFull.total) || 0}
          shipping={parseFloat(orderFull.shipping_total || "0") || 0}
          coupon={orderFull.coupon_lines?.[0]?.code}
          items={orderFull.line_items.map((i) => ({
            id: i.variation_id || i.product_id,
            quantity: i.quantity,
            price: parseFloat(i.total) / Math.max(1, i.quantity),
            name: i.name,
          }))}
          email={orderFull.billing?.email}
          firstName={orderFull.billing?.first_name}
          lastName={orderFull.billing?.last_name}
          phone={orderFull.billing?.phone}
          address={{
            street: orderFull.billing?.address_1,
            city: orderFull.billing?.city,
            region: orderFull.billing?.state,
            postal_code: orderFull.billing?.postcode,
            country: orderFull.billing?.country,
          }}
        />
      )}
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        {isTransferencia ? (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Pedido confirmado</h1>
            <p className="text-gray-500 text-lg mb-4">
              Tu pedido #{order} fue registrado. Realiza la transferencia para que lo procesemos.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-left mb-6">
              <h3 className="font-bold text-blue-900 mb-3">Datos para transferencia</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-blue-700">Banco</span><span className="font-medium text-blue-900">Santander</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Cuenta</span><span className="font-medium text-blue-900">Cta. Cte. 366-000367/2</span></div>
                <div className="flex justify-between"><span className="text-blue-700">CBU</span><span className="font-medium text-blue-900 font-mono text-xs">0720366220000000036722</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Alias</span><span className="font-medium text-blue-900">PERA.RAMA.PIANO</span></div>
                <div className="flex justify-between"><span className="text-blue-700">Titular</span><span className="font-medium text-blue-900">Sistema Continuo S.H.</span></div>
                <div className="flex justify-between"><span className="text-blue-700">CUIT</span><span className="font-medium text-blue-900">30-71126591-7</span></div>
              </div>
              <p className="text-xs text-blue-600 mt-3">Una vez acreditado el pago (1-2 días hábiles), procesamos tu pedido y te avisamos por email.</p>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 text-left mb-6">
              <p className="text-sm text-amber-900 mb-3">
                <strong>Importante:</strong> Una vez hecha la transferencia, envianos el comprobante por WhatsApp al
                {" "}<strong>+54 9 11 3346-6497</strong> con el número de pedido <strong>#{order}</strong>. Sin el comprobante no podemos confirmar tu pedido.
              </p>
              <a
                href={`https://wa.me/5491133466497?text=${encodeURIComponent(
                  `Hola! Te paso el comprobante de mi transferencia.\nPedido #${order}` +
                  (orderFull?.total ? `\nTotal: ARS ${parseFloat(orderFull.total).toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : "")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.464 3.488"/></svg>
                Enviar comprobante por WhatsApp
              </a>
            </div>
          </>
        ) : isEfectivo ? (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Pedido confirmado</h1>
            <p className="text-gray-500 text-lg mb-4">
              Tu pedido #{order} fue registrado. Te esperamos en nuestro local para el pago y retiro.
            </p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-left mb-6">
              <h3 className="font-bold text-amber-900 mb-3">Datos del local</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-amber-700">Dirección</span><span className="font-medium text-amber-900">Av. Rivadavia 17002, Haedo</span></div>
                <div className="flex justify-between"><span className="text-amber-700">Horario</span><span className="font-medium text-amber-900">Lun a Vie 9-13 y 14-18hs</span></div>
                <div className="flex justify-between"><span className="text-amber-700">Teléfono</span><span className="font-medium text-amber-900">(011) 4650-1592</span></div>
              </div>
              <p className="text-xs text-amber-600 mt-3">Te avisamos por email/WhatsApp cuando tu pedido esté listo para retirar.</p>
            </div>
          </>
        ) : isApproved ? (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Pago aprobado</h1>
            <p className="text-gray-500 text-lg mb-2">
              Tu pedido #{order} fue procesado correctamente.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Te enviamos un email de confirmación con los detalles de tu compra.
              Nuestro equipo te contactará para coordinar el envío.
            </p>
          </>
        ) : isRefunded ? (
          <>
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Pedido reembolsado</h1>
            <p className="text-gray-500 text-lg mb-2">
              Tu pedido #{order} fue reembolsado. El dinero vuelve a tu cuenta en 5-10 días hábiles.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Cualquier consulta, contactanos por WhatsApp.
            </p>
          </>
        ) : isPending ? (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Pago pendiente</h1>
            <p className="text-gray-500 text-lg mb-2">
              Tu pedido #{order} está pendiente de confirmación.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Si elegiste pago por transferencia o efectivo, completa el pago para que procesemos tu pedido.
              Te enviamos los datos por email.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Hubo un problema</h1>
            <p className="text-gray-500 text-lg mb-2">
              El pago no pudo ser procesado.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Podes intentar nuevamente o contactarnos por WhatsApp para ayudarte.
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#013d5a] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer"
          >
            Seguir comprando
          </Link>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_GENERAL || "5491130793862"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-green-600 transition-colors cursor-pointer"
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>

      {/* Google Customer Reviews opt-in */}
      {order && email && (
        <GoogleCustomerReviews orderId={order} email={email} shippingMethod={shipping} />
      )}
    </main>
  );
}
