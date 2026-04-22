import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contactanos por WhatsApp, teléfono o email. Av. Rivadavia 17002, Haedo. Atención de lunes a viernes.",
};

export default function ContactoPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-5">
          <Link href="/" className="hover:text-[#013d5a]">Inicio</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Contacto</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Contacto</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_GENERAL || "5491130793862"}?text=Hola%2C%20quiero%20hacer%20una%20consulta`} target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-lg p-6 transition-all">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">WhatsApp</h2>
            <p className="text-sm text-gray-500">11 3079-3862</p>
            <p className="text-xs text-gray-400 mt-1">Respuesta inmediata en horario comercial</p>
          </a>

          <a href="tel:+541146501592" className="bg-white rounded-xl border border-gray-100 hover:border-[#013d5a]/20 hover:shadow-lg p-6 transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Teléfono</h2>
            <p className="text-sm text-gray-500">(011) 4650-1592</p>
            <p className="text-xs text-gray-400 mt-1">Lunes a viernes 9 a 13 y 14 a 18hs</p>
          </a>

          <a href="mailto:ventas@sistemacontinuo.com.ar" className="bg-white rounded-xl border border-gray-100 hover:border-[#013d5a]/20 hover:shadow-lg p-6 transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Email</h2>
            <p className="text-sm text-gray-500">ventas@sistemacontinuo.com.ar</p>
            <p className="text-xs text-gray-400 mt-1">Respondemos en menos de 24hs</p>
          </a>

          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Local</h2>
            <p className="text-sm text-gray-500">Av. Rivadavia 17002, Haedo (1706)</p>
            <p className="text-sm text-gray-500">Buenos Aires, Argentina</p>
            <p className="text-xs text-gray-400 mt-1">Lunes a viernes 9 a 13 y 14 a 18hs</p>
          </div>
        </div>
      </div>
    </main>
  );
}
