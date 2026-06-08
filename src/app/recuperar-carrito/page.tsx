"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

interface RecoveryData {
  success: boolean;
  email?: string;
  name?: string;
  items?: { id: number; sku: string; name: string; quantity: number; price: number }[];
  total?: number;
  recovered?: boolean;
  /** Cupón único asociado al carrito — auto-aplicado al llegar al checkout. */
  coupon_code?: string | null;
  error?: string;
}

function RecuperarCarritoInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const token = params.get("t");

  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoredCount, setRestoredCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`/api/abandoned-cart/recover?t=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d: RecoveryData) => setData(d))
      .catch(() => setData({ success: false, error: "fetch_failed" }))
      .finally(() => setLoading(false));
  }, [token]);

  async function restore() {
    if (!data?.items?.length) return;
    setRestoring(true);
    let ok = 0;
    for (const item of data.items) {
      try {
        await addToCart(item.id, item.quantity);
        ok++;
        setRestoredCount(ok);
      } catch {
        // Si un item falla (sin stock, descatalogado), seguimos con los demás
      }
    }
    setRestoring(false);
    // Si hay cupón asociado, llevar directo al checkout con coupon en query
    // para que se auto-aplique (evita la fricción de tipear el código del email).
    // Email también va en la query — los SC-AB-* tienen email_restrictions y
    // el auto-apply necesita que el email esté precargado para no rebotar.
    // Si no hay cupón, /carrito como antes.
    const dest = data?.coupon_code
      ? `/checkout?coupon=${encodeURIComponent(data.coupon_code)}&email=${encodeURIComponent(data.email || "")}`
      : "/carrito";
    setTimeout(() => router.push(dest), 600);
  }

  if (!token) {
    return (
      <CenteredCard title="Link inválido">
        <p className="text-gray-600 mb-4">
          El link de recuperación no es válido o está incompleto.
        </p>
        <Link href="/" className="inline-block bg-[#013d5a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#01567a]">
          Volver al inicio
        </Link>
      </CenteredCard>
    );
  }

  if (loading) {
    return <CenteredCard title="Recuperando tu carrito…"><Spinner /></CenteredCard>;
  }

  if (!data?.success) {
    return (
      <CenteredCard title="No encontramos tu carrito">
        <p className="text-gray-600 mb-4">
          El link puede haber expirado o ya lo usaste. Si querés, empezá de nuevo.
        </p>
        <Link href="/" className="inline-block bg-[#013d5a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#01567a]">
          Ir a la tienda
        </Link>
      </CenteredCard>
    );
  }

  if (data.recovered) {
    return (
      <CenteredCard title={`${data.name || "Hola"}, ya completaste esta compra`}>
        <p className="text-gray-600 mb-4">
          El carrito asociado a este link ya fue recuperado. ¡Gracias por tu compra!
        </p>
        <Link href="/mi-cuenta/pedidos" className="inline-block bg-[#013d5a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#01567a]">
          Ver mis pedidos
        </Link>
      </CenteredCard>
    );
  }

  const items = data.items || [];
  const total = data.total || 0;

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {data.name ? `Hola ${data.name},` : "Hola,"} tu carrito te espera
          </h1>
          <p className="text-gray-600 mb-6">
            Dejaste estos {items.length} producto{items.length === 1 ? "" : "s"} sin comprar. Recuperalos con un click.
          </p>

          <ul className="divide-y divide-gray-100 mb-6">
            {items.map((i, idx) => (
              <li key={idx} className="py-3 flex justify-between items-start gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{i.name}</p>
                  <p className="text-xs text-gray-500">Cantidad: {i.quantity}</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-nowrap">
                  ${(i.price * i.quantity).toLocaleString("es-AR")}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-6">
            <span className="text-sm font-medium text-gray-500">Total</span>
            <span className="text-2xl font-bold text-gray-900">
              ${total.toLocaleString("es-AR")}
            </span>
          </div>

          <button
            onClick={restore}
            disabled={restoring}
            className="w-full bg-[#013d5a] hover:bg-[#01567a] text-white px-6 py-4 rounded-xl font-semibold disabled:opacity-60 transition-colors"
          >
            {restoring
              ? `Recuperando ${restoredCount}/${items.length}…`
              : "Recuperar mi carrito y pagar"}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            Si algún producto quedó sin stock, lo vas a ver al llegar al carrito.
          </p>
        </div>
      </div>
    </main>
  );
}

function CenteredCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-4">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#013d5a] rounded-full animate-spin" />
    </div>
  );
}

export default function RecuperarCarritoPage() {
  return (
    <Suspense fallback={<CenteredCard title="Cargando…"><Spinner /></CenteredCard>}>
      <RecuperarCarritoInner />
    </Suspense>
  );
}
