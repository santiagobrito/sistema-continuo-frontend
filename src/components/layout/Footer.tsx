import Link from "next/link";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491130793862";

export function Footer() {
  return (
    <footer className="bg-[#013d5a] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* About */}
        <div>
          <h3 className="font-bold text-lg mb-4">Sistema Continuo</h3>
          <p className="text-sm text-blue-100 leading-relaxed">
            Maquinaria de impresion, estampadoras, papeleria profesional y productos para sublimacion.
          </p>
          <div className="flex gap-3 mt-4">
            <a href="https://www.instagram.com/sistemacontinuo" target="_blank" rel="noopener noreferrer" className="text-blue-200 hover:text-white">
              Instagram
            </a>
            <a href="https://www.facebook.com/sistemacontinuo" target="_blank" rel="noopener noreferrer" className="text-blue-200 hover:text-white">
              Facebook
            </a>
            <a href="https://www.youtube.com/@sistemacontinuo" target="_blank" rel="noopener noreferrer" className="text-blue-200 hover:text-white">
              YouTube
            </a>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="font-bold mb-4">Categorias</h3>
          <ul className="space-y-2 text-sm text-blue-100">
            <li><Link href="/estampadoras" className="hover:text-white">Estampadoras</Link></li>
            <li><Link href="/impresoras" className="hover:text-white">Impresoras</Link></li>
            <li><Link href="/silhouette" className="hover:text-white">Silhouette</Link></li>
            <li><Link href="/productos-para-sublimar" className="hover:text-white">Sublimables</Link></li>
            <li><Link href="/tintas" className="hover:text-white">Tintas</Link></li>
            <li><Link href="/papeles" className="hover:text-white">Papeles</Link></li>
            <li><Link href="/gran-formato" className="hover:text-white">Gran Formato</Link></li>
          </ul>
        </div>

        {/* Help */}
        <div>
          <h3 className="font-bold mb-4">Ayuda</h3>
          <ul className="space-y-2 text-sm text-blue-100">
            <li><Link href="/contacto" className="hover:text-white">Contacto</Link></li>
            <li><Link href="/faq" className="hover:text-white">Preguntas frecuentes</Link></li>
            <li><Link href="/como-comprar" className="hover:text-white">Como comprar</Link></li>
            <li><Link href="/formas-de-pago" className="hover:text-white">Formas de pago</Link></li>
            <li><Link href="/descargas" className="hover:text-white">Descargas</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-bold mb-4">Contacto</h3>
          <ul className="space-y-3 text-sm text-blue-100">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">Av. Rivadavia 17002, Haedo, Buenos Aires</span>
            </li>
            <li>
              <a href="tel:+541146501592" className="hover:text-white">(011) 4650-1592</a>
            </li>
            <li>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                WhatsApp: 11 3079-3862
              </a>
            </li>
            <li>
              <a href="mailto:ventas@sistemacontinuo.com.ar" className="hover:text-white">
                ventas@sistemacontinuo.com.ar
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-blue-800">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-blue-200">
          &copy; {new Date().getFullYear()} Sistema Continuo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
