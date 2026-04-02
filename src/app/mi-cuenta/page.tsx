import Link from "next/link";

export const metadata = {
  title: "Mi cuenta",
};

export default function MiCuentaPage() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-[#013d5a]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#013d5a]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Mi cuenta</h1>
        <p className="text-gray-500 mb-8">
          Proximamente vas a poder ver tus pedidos, guardar direcciones y gestionar tu cuenta.
        </p>
        <div className="space-y-3">
          <Link href="/" className="block w-full bg-[#013d5a] text-white py-3 rounded-xl font-semibold hover:bg-[#01567a] transition-colors cursor-pointer">
            Ir a la tienda
          </Link>
          <a
            href="https://wa.me/5491130793862?text=Hola%2C%20quiero%20consultar%20sobre%20un%20pedido"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors cursor-pointer"
          >
            Consultar pedido por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
