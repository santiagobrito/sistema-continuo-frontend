"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatStorePrice } from "@/lib/utils/format";
import Link from "next/link";

const SHIPPING_OPTIONS = [
  { id: "local_pickup", label: "Retiro en local (Haedo)", price: 0, needsAddress: false },
  { id: "moto_caba", label: "Moto CABA — $4.836", price: 4836, needsAddress: true },
  { id: "moto_gba1", label: "Moto GBA Zona 1 — $7.728", price: 7728, needsAddress: true },
  { id: "moto_gba2", label: "Moto GBA Zona 2 — $10.725", price: 10725, needsAddress: true },
  { id: "correo_domicilio", label: "Correo Argentino a domicilio (a cotizar)", price: 0, needsAddress: true },
  { id: "correo_sucursal", label: "Correo Argentino a sucursal (a cotizar)", price: 0, needsAddress: true },
  { id: "transporte", label: "Transporte al interior — $3.061 despacho", price: 3061, needsAddress: true },
];

const PROVINCIAS = [
  { code: "C", name: "CABA" }, { code: "B", name: "Buenos Aires" }, { code: "K", name: "Catamarca" },
  { code: "H", name: "Chaco" }, { code: "U", name: "Chubut" }, { code: "X", name: "Cordoba" },
  { code: "W", name: "Corrientes" }, { code: "E", name: "Entre Rios" }, { code: "P", name: "Formosa" },
  { code: "Y", name: "Jujuy" }, { code: "L", name: "La Pampa" }, { code: "F", name: "La Rioja" },
  { code: "M", name: "Mendoza" }, { code: "N", name: "Misiones" }, { code: "Q", name: "Neuquen" },
  { code: "R", name: "Rio Negro" }, { code: "A", name: "Salta" }, { code: "J", name: "San Juan" },
  { code: "D", name: "San Luis" }, { code: "Z", name: "Santa Cruz" }, { code: "S", name: "Santa Fe" },
  { code: "G", name: "Santiago del Estero" }, { code: "V", name: "Tierra del Fuego" }, { code: "T", name: "Tucuman" },
];

export default function CheckoutPage() {
  const { cart } = useCart();
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "", dni_cuit: "",
    address_1: "", city: "", state: "", postcode: "",
  });
  const [shippingMethod, setShippingMethod] = useState("local_pickup");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!cart || cart.items.length === 0) {
    return (
      <main className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No hay productos en el carrito.</p>
          <Link href="/" className="text-[#013d5a] font-semibold hover:underline cursor-pointer">Volver a la tienda</Link>
        </div>
      </main>
    );
  }

  const selectedShipping = SHIPPING_OPTIONS.find((o) => o.id === shippingMethod);
  const needsAddress = selectedShipping?.needsAddress ?? false;
  const shippingCost = selectedShipping?.price || 0;
  const subtotal = parseInt(cart.totals.total_items || "0");
  const total = subtotal + shippingCost;

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const items = cart!.items.map((item) => ({
        product_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: parseInt(item.prices.price),
        image: item.images[0]?.src,
      }));

      const res = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          billing: formData,
          shipping_method: shippingMethod,
          shipping_cost: shippingCost,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar el pedido");

      window.location.href = data.sandboxInitPoint || data.initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSubmitting(false);
    }
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10 transition-colors";

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/carrito" className="text-sm text-gray-500 hover:text-[#013d5a] cursor-pointer">Carrito</Link>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="text-sm font-semibold text-gray-900">Finalizar compra</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: form */}
            <div className="lg:col-span-2 space-y-5">

              {/* 1. Contact + DNI */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#013d5a] text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                  Tus datos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input required placeholder="Nombre *" value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} className={inputClass} />
                  <input required placeholder="Apellido *" value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} className={inputClass} />
                  <input required type="email" placeholder="Email *" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className={inputClass} />
                  <input required type="tel" placeholder="Telefono *" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputClass} />
                  <input required placeholder="DNI / CUIT *" value={formData.dni_cuit} onChange={(e) => updateField("dni_cuit", e.target.value)} className={`${inputClass} sm:col-span-2`} />
                </div>
              </div>

              {/* 2. Shipping method (compact select) */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#013d5a] text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                  Envio
                </h2>
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className={`${inputClass} cursor-pointer font-medium`}
                >
                  {SHIPPING_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}{opt.price === 0 && opt.id === "local_pickup" ? " — Gratis" : ""}
                    </option>
                  ))}
                </select>

                {/* Address fields (shown only when shipping requires it) */}
                {needsAddress && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input required placeholder="Direccion *" value={formData.address_1} onChange={(e) => updateField("address_1", e.target.value)} className={`${inputClass} sm:col-span-2`} />
                    <input required placeholder="Ciudad *" value={formData.city} onChange={(e) => updateField("city", e.target.value)} className={inputClass} />
                    <input required placeholder="Codigo postal *" value={formData.postcode} onChange={(e) => updateField("postcode", e.target.value)} className={inputClass} />
                    <select required value={formData.state} onChange={(e) => updateField("state", e.target.value)} className={`${inputClass} cursor-pointer`}>
                      <option value="">Provincia *</option>
                      {PROVINCIAS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
                <h2 className="font-bold text-gray-900 mb-4">Tu pedido</h2>

                {/* Items compact */}
                <div className="space-y-2.5 mb-4 max-h-60 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.key} className="flex items-center gap-3">
                      <div className="w-10 h-10 relative flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        {item.images[0] && (
                          <img src={item.images[0].thumbnail || item.images[0].src} alt="" className="w-full h-full object-contain" />
                        )}
                        <span className="absolute -top-1 -right-1 bg-gray-700 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{item.quantity}</span>
                      </div>
                      <p className="text-xs text-gray-700 flex-1 line-clamp-1">{item.name}</p>
                      <p className="text-xs font-bold text-gray-900 flex-shrink-0">{formatStorePrice(item.totals.line_total)}</p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatStorePrice(cart.totals.total_items)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Envio</span>
                    <span className="font-medium">
                      {shippingCost > 0 ? `$${shippingCost.toLocaleString("es-AR")}` : selectedShipping?.id === "local_pickup" ? "Gratis" : "A cotizar"}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-gray-900">${total.toLocaleString("es-AR")}</span>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 w-full flex items-center justify-center gap-2 bg-[#009ee3] hover:bg-[#0087c9] text-white py-4 rounded-xl font-bold text-base transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Procesando...
                    </>
                  ) : (
                    "Pagar con MercadoPago"
                  )}
                </button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Compra 100% segura — Redirigido a MercadoPago
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
