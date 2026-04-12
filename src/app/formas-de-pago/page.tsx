import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Formas de pago",
  description: "MercadoPago hasta 12 cuotas, transferencia bancaria y efectivo. Todos los medios de pago disponibles.",
};

export default function FormasDePagoPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Formas de pago</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Formas de pago</h1>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#009ee3]/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#009ee3]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">MercadoPago</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>Tarjeta de crédito hasta 12 cuotas sin interés</li>
              <li>Tarjeta de débito</li>
              <li>Dinero en cuenta MercadoPago</li>
              <li>Rapipago y Pago Fácil</li>
            </ul>
            <p className="text-xs text-gray-400 mt-3">Pago seguro procesado directamente por MercadoPago. No almacenamos datos de tarjeta.</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Transferencia bancaria</h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">Realiza una transferencia o depósito bancario. Al confirmar el pedido te enviamos los datos (CBU, alias, titular) por email.</p>
            <p className="text-xs text-gray-400">El pedido se procesa una vez acreditado el pago (1-2 días hábiles).</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Efectivo en local</h2>
            </div>
            <p className="text-sm text-gray-600 mb-2">Pagas al momento de retirar tu pedido en nuestro local.</p>
            <p className="text-sm text-gray-500">Av. Rivadavia 17002, Haedo — Lunes a viernes 9 a 13 y 14 a 18hs.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
