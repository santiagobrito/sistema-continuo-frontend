import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Envíos",
  description: "Envíos a todo el país: moto CABA/GBA, Correo Argentino y transporte al interior. Retiro gratis en Haedo.",
};

export default function EnviosPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Envíos</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Envíos</h1>

        <div className="space-y-4">
          {[
            { title: "Retiro en local", price: "Gratis", time: "Disponible en 24-48hs hábiles", desc: "Av. Rivadavia 17002, Haedo. Te avisamos cuando tu pedido esté listo. Lunes a viernes 9-13 y 14-18hs.", zones: "Todos" },
            { title: "Moto CABA", price: "$5.610", time: "Despacho en 24-48hs hábiles", desc: "Envío en moto a domicilio dentro de CABA. Precio por bulto — según el pedido puede ajustarse.", zones: "CABA" },
            { title: "Moto GBA Zona 1", price: "$8.910", time: "Despacho en 24-48hs hábiles", desc: "San Fernando, San Isidro, San Martín, Vicente López, Hurlingham, Ituzaingó, Morón, 3 de Febrero, La Matanza Norte, Lomas de Zamora, Lanús, Avellaneda. Precio por bulto — según el pedido puede ajustarse.", zones: "GBA cercano" },
            { title: "Moto GBA Zona 2", price: "$12.650", time: "Despacho en 24-48hs hábiles", desc: "Tigre, Malvinas, José C. Paz, San Miguel, Moreno, Merlo, Ezeiza, Echeverría, Almirante Brown, Florencio Varela, Berazategui, Quilmes, Pilar, La Plata. Precio por bulto — según el pedido puede ajustarse.", zones: "GBA ampliado" },
            { title: "Correo Argentino a domicilio", price: "Calculado en checkout", time: "Entrega 3-7 días hábiles", desc: "Envío a domicilio por Correo Argentino. El costo se calcula automáticamente según peso y destino al ingresar el código postal.", zones: "Todo el país" },
            { title: "Correo Argentino a sucursal o puntos de recogida", price: "Calculado en checkout", time: "Entrega 3-7 días hábiles", desc: "Retiro en sucursal de Correo Argentino o punto de recogida más cercano. Más económico que a domicilio.", zones: "Todo el país" },
            { title: "Transporte al interior (micro)", price: "$3.300 despacho", time: "Despacho en 3 días hábiles", desc: "Se cobra costo de despacho por bulto — según el pedido puede ajustarse. El flete del transporte se abona al retirar en destino (terminal o sucursal). Indicar transporte de preferencia.", zones: "Interior" },
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
            <li>Los tiempos de despacho son en días hábiles a partir de la confirmación del pago.</li>
            <li>Para equipos de gran formato, el envío se cotiza de forma personalizada.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
