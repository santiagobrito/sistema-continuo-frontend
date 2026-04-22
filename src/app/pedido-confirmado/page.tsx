import Link from "next/link";
import { GoogleCustomerReviews } from "./GoogleCustomerReviews";
import { ClearCartOnSuccess } from "./ClearCartOnSuccess";

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
  if (order && !effectiveStatus) {
    const wcStatus = await fetchWcOrderStatus(order);
    if (wcStatus === "processing" || wcStatus === "completed" || wcStatus === "preparing" || wcStatus === "sent-to-tactica" || wcStatus === "shipped" || wcStatus === "at-branch") {
      effectiveStatus = "approved";
    } else if (wcStatus === "failed" || wcStatus === "cancelled") {
      effectiveStatus = "rejected";
    } else if (wcStatus === "refunded") {
      effectiveStatus = "refunded";
    } else if (wcStatus) {
      // pending, on-hold, o cualquier estado desconocido → asumir pendiente
      effectiveStatus = "pending";
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
