import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Envios — Sistema Continuo",
  description: "Envios a todo el pais: moto CABA/GBA, Correo Argentino y transporte al interior. Retiro gratis en Haedo.",
};

export default function EnviosPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Envios</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Envios</h1>

        <div className="space-y-4">
          {[
            { title: "Retiro en local", price: "Gratis", time: "Disponible en 24-48hs habiles", desc: "Av. Rivadavia 17002, Haedo. Te avisamos cuando tu pedido este listo. Lunes a viernes 9-13 y 14-18hs.", zones: "Todos" },
            { title: "Moto CABA", price: "$4.836", time: "Despacho en 24-48hs habiles", desc: "Envio en moto a domicilio dentro de CABA. Costo por 1 bulto. Monto minimo de compra: $25.000.", zones: "CABA" },
            { title: "Moto GBA Zona 1", price: "$7.728", time: "Despacho en 24-48hs habiles", desc: "San Fernando, San Isidro, San Martin, Vicente Lopez, Hurlingham, Ituzaingo, Moron, 3 de Febrero, La Matanza Norte, Lomas de Zamora, Lanus, Avellaneda.", zones: "GBA cercano" },
            { title: "Moto GBA Zona 2", price: "$10.725", time: "Despacho en 24-48hs habiles", desc: "Tigre, Malvinas, Jose C. Paz, San Miguel, Moreno, Merlo, Ezeiza, Echeverria, Almirante Brown, Florencio Varela, Berazategui, Quilmes, Pilar, La Plata.", zones: "GBA ampliado" },
            { title: "Correo Argentino a domicilio", price: "A cotizar", time: "Entrega 3-7 dias habiles", desc: "Envio a domicilio por Correo Argentino. El costo se cotiza al confirmar el pedido y se informa por email/WhatsApp.", zones: "Todo el pais" },
            { title: "Correo Argentino a sucursal", price: "A cotizar", time: "Entrega 3-7 dias habiles", desc: "Envio a sucursal de Correo Argentino mas cercana. Mas economico que a domicilio.", zones: "Todo el pais" },
            { title: "Transporte al interior", price: "$3.061 despacho", time: "Despacho en 3 dias habiles", desc: "Se cobra costo de despacho. El flete del transporte se abona al retirar en destino (terminal o sucursal). Indicar transporte de preferencia.", zones: "Interior" },
          ].map((opt, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-gray-900">{opt.title}</h2>
                <span className="text-sm font-bold text-[#013d5a]">{opt.price}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{opt.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#013d5a] font-medium">{opt.time}</span>
                <span className="text-xs text-gray-400">Zona: {opt.zones}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
          <h3 className="font-bold text-blue-900 mb-2">Importante</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Los tiempos de despacho son en dias habiles a partir de la confirmacion del pago.</li>
            <li>Los costos de moto aplican para pedidos con monto minimo de $25.000.</li>
            <li>Para equipos de gran formato, el envio se cotiza de forma personalizada.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
