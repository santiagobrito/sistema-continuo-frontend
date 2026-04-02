"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils/format";

interface Order {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  line_items: { name: string; quantity: number }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  processing: { label: "En proceso", color: "bg-blue-100 text-blue-700" },
  "on-hold": { label: "En espera", color: "bg-orange-100 text-orange-700" },
  completed: { label: "Completado", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-500" },
  refunded: { label: "Reembolsado", color: "bg-purple-100 text-purple-700" },
  failed: { label: "Fallido", color: "bg-red-100 text-red-700" },
  "sent-to-tactica": { label: "Pasado a Tactica", color: "bg-indigo-100 text-indigo-700" },
  preparing: { label: "Preparando", color: "bg-cyan-100 text-cyan-700" },
  shipped: { label: "Enviado", color: "bg-emerald-100 text-emerald-700" },
  "at-branch": { label: "En sucursal", color: "bg-teal-100 text-teal-700" },
};

export default function MiCuentaPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/iniciar-sesion");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    fetch(`/api/auth/orders`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <main className="bg-gray-50 min-h-screen flex items-center justify-center">
        <svg className="w-8 h-8 text-[#013d5a] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </main>
    );
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hola, {user.name.split(" ")[0]}</h1>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>
          <button
            onClick={async () => { await logout(); router.push("/"); }}
            className="px-4 py-2 text-sm text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 transition-colors cursor-pointer"
          >
            Cerrar sesion
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/mi-cuenta/pedidos" className="bg-white rounded-xl border border-gray-100 hover:border-[#013d5a]/20 p-5 transition-all cursor-pointer">
            <svg className="w-6 h-6 text-[#013d5a] mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
            <h3 className="font-semibold text-gray-900 text-sm">Mis pedidos</h3>
            <p className="text-xs text-gray-500 mt-1">Ver historial de compras</p>
          </Link>
          <Link href="/" className="bg-white rounded-xl border border-gray-100 hover:border-[#013d5a]/20 p-5 transition-all cursor-pointer">
            <svg className="w-6 h-6 text-[#013d5a] mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0A2.999 2.999 0 015.999 7.5h12.002A2.999 2.999 0 0121 9.349" /></svg>
            <h3 className="font-semibold text-gray-900 text-sm">Seguir comprando</h3>
            <p className="text-xs text-gray-500 mt-1">Explorar productos</p>
          </Link>
          <a href="https://wa.me/5491130793862?text=Hola%2C%20quiero%20consultar%20sobre%20un%20pedido" target="_blank" rel="noopener noreferrer" className="bg-white rounded-xl border border-gray-100 hover:border-green-200 p-5 transition-all cursor-pointer">
            <svg className="w-6 h-6 text-green-600 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            <h3 className="font-semibold text-gray-900 text-sm">Soporte</h3>
            <p className="text-xs text-gray-500 mt-1">Consultar por WhatsApp</p>
          </a>
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Ultimos pedidos</h2>
          </div>

          {loadingOrders ? (
            <div className="p-8 text-center">
              <svg className="w-6 h-6 text-gray-300 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : orders.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {orders.map((order) => {
                const status = STATUS_LABELS[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={order.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">#{order.number}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {order.line_items.slice(0, 2).map((li) => `${li.name} x${li.quantity}`).join(", ")}
                        {order.line_items.length > 2 && ` +${order.line_items.length - 2} mas`}
                      </p>
                      <span className="text-xs text-gray-400">
                        {new Date(order.date_created).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">Aun no tenes pedidos.</p>
              <Link href="/" className="text-sm text-[#013d5a] font-semibold hover:underline cursor-pointer mt-2 inline-block">
                Explorar productos
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
