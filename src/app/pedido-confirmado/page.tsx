import Link from "next/link";

interface Props {
  searchParams: Promise<{ order?: string; status?: string }>;
}

export default async function OrderConfirmedPage({ searchParams }: Props) {
  const { order, status } = await searchParams;

  const isApproved = status === "approved";
  const isPending = status === "pending";

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        {isApproved ? (
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
              Te enviamos un email de confirmacion con los detalles de tu compra.
              Nuestro equipo te contactara para coordinar el envio.
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
              Tu pedido #{order} esta pendiente de confirmacion.
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
            href="https://wa.me/5491130793862"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-green-600 transition-colors cursor-pointer"
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
