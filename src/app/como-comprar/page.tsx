import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cómo comprar",
  description: "Guía paso a paso para comprar en Sistema Continuo. Registro, carrito, checkout y medios de pago.",
};

export default function ComoComprarPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Cómo comprar</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Cómo comprar</h1>

        <div className="space-y-6">
          {[
            { step: 1, title: "Busca tus productos", desc: "Navega por categorías, usa el buscador o explora las marcas. Cada producto tiene fotos, descripción y especificaciones detalladas." },
            { step: 2, title: "Agrega al carrito", desc: "Hace click en \"Agregar al carrito\" y selecciona la cantidad que necesitas. Si el producto tiene variaciones (color, tamaño), elegí la opción que prefieras." },
            { step: 3, title: "Revisa tu carrito", desc: "En el carrito podes modificar cantidades o eliminar productos. Si compras en cantidad, se aplican descuentos automáticos." },
            { step: 4, title: "Completa tus datos", desc: "Ingresa nombre, email, teléfono y DNI/CUIT. Si ya tenes cuenta, los datos se completan automáticamente." },
            { step: 5, title: "Elegí método de envío", desc: "Selecciona tu provincia y elegí entre retiro en local (gratis), moto CABA/GBA, Correo Argentino o transporte al interior." },
            { step: 6, title: "Elegí cómo pagar", desc: "MercadoPago (tarjeta hasta 12 cuotas, débito, Rapipago), transferencia bancaria o efectivo en local." },
            { step: 7, title: "Confirmación", desc: "Recibís un email con los detalles de tu pedido. Nuestro equipo lo prepara y te avisa cuando está listo para despachar." },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4">
              <div className="w-10 h-10 bg-[#013d5a] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 mb-1">{item.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-green-50 border border-green-100 rounded-xl p-5 text-center">
          <p className="text-sm text-green-800">¿Dudas? Escribinos por <a href="https://wa.me/5491133466497" target="_blank" rel="noopener noreferrer" className="font-semibold underline">WhatsApp</a> y te ayudamos en el momento.</p>
        </div>
      </div>
    </main>
  );
}
