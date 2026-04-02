"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatStorePrice } from "@/lib/utils/format";
import Link from "next/link";

const SHIPPING_OPTIONS = [
  { id: "correo_domicilio", label: "Correo Argentino a domicilio", price: 0, note: "Cotizacion al confirmar" },
  { id: "correo_sucursal", label: "Correo Argentino a sucursal", price: 0, note: "Cotizacion al confirmar" },
  { id: "moto_caba", label: "Moto CABA", price: 4836, note: "1 bulto, monto minimo $25.000" },
  { id: "moto_gba1", label: "Moto GBA Zona 1", price: 7728, note: "1 bulto, monto minimo $25.000" },
  { id: "moto_gba2", label: "Moto GBA Zona 2", price: 10725, note: "1 bulto, monto minimo $25.000" },
  { id: "transporte", label: "Transporte al interior", price: 3061, note: "Despacho. Flete se abona en destino" },
  { id: "local_pickup", label: "Retiro en local (Haedo)", price: 0, note: "Av. Rivadavia 17002" },
];

export default function CheckoutPage() {
  const { cart } = useCart();
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "",
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

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el pedido");
      }

      // Redirect to MercadoPago
      const mpUrl = data.sandboxInitPoint || data.initPoint;
      window.location.href = mpUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/carrito" className="text-sm text-gray-500 hover:text-[#013d5a] cursor-pointer">Carrito</Link>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="text-sm font-semibold text-gray-900">Checkout</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Datos de contacto</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
                    <input required value={formData.first_name} onChange={(e) => updateField("first_name", e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido *</label>
                    <input required value={formData.last_name} onChange={(e) => updateField("last_name", e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                    <input required type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefono *</label>
                    <input required type="tel" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10" placeholder="11 1234-5678" />
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Envio</h2>
                <div className="space-y-2">
                  {SHIPPING_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        shippingMethod === opt.id
                          ? "border-[#013d5a] bg-[#013d5a]/5"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={opt.id}
                        checked={shippingMethod === opt.id}
                        onChange={() => setShippingMethod(opt.id)}
                        className="w-4 h-4 text-[#013d5a] cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500">{opt.note}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {opt.price === 0 ? (opt.id === "local_pickup" ? "Gratis" : "A cotizar") : `$${opt.price.toLocaleString("es-AR")}`}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Address (not for local pickup) */}
                {shippingMethod !== "local_pickup" && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Direccion de envio</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Direccion *</label>
                        <input required value={formData.address_1} onChange={(e) => updateField("address_1", e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a]" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Ciudad *</label>
                        <input required value={formData.city} onChange={(e) => updateField("city", e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a]" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Codigo postal *</label>
                        <input required value={formData.postcode} onChange={(e) => updateField("postcode", e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a]" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Provincia *</label>
                        <select value={formData.state} onChange={(e) => updateField("state", e.target.value)} required className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a] cursor-pointer">
                          <option value="">Seleccionar...</option>
                          <option value="C">CABA</option>
                          <option value="B">Buenos Aires</option>
                          <option value="K">Catamarca</option>
                          <option value="H">Chaco</option>
                          <option value="U">Chubut</option>
                          <option value="X">Cordoba</option>
                          <option value="W">Corrientes</option>
                          <option value="E">Entre Rios</option>
                          <option value="P">Formosa</option>
                          <option value="Y">Jujuy</option>
                          <option value="L">La Pampa</option>
                          <option value="F">La Rioja</option>
                          <option value="M">Mendoza</option>
                          <option value="N">Misiones</option>
                          <option value="Q">Neuquen</option>
                          <option value="R">Rio Negro</option>
                          <option value="A">Salta</option>
                          <option value="J">San Juan</option>
                          <option value="D">San Luis</option>
                          <option value="Z">Santa Cruz</option>
                          <option value="S">Santa Fe</option>
                          <option value="G">Santiago del Estero</option>
                          <option value="V">Tierra del Fuego</option>
                          <option value="T">Tucuman</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-28">
                <h2 className="font-bold text-gray-900 mb-4">Tu pedido</h2>
                <div className="space-y-3 mb-4">
                  {cart.items.map((item) => (
                    <div key={item.key} className="flex gap-3">
                      <div className="w-12 h-12 relative flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        {item.images[0] && (
                          <img src={item.images[0].thumbnail || item.images[0].src} alt="" className="w-full h-full object-contain" />
                        )}
                        <span className="absolute -top-1 -right-1 bg-gray-800 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{item.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 line-clamp-2">{item.name}</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-900 flex-shrink-0">{formatStorePrice(item.totals.line_total)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatStorePrice(cart.totals.total_items)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Envio</span>
                    <span>{shippingCost > 0 ? `$${shippingCost.toLocaleString("es-AR")}` : selectedShipping?.id === "local_pickup" ? "Gratis" : "A cotizar"}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="text-xl font-bold">${total.toLocaleString("es-AR")}</span>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-[#00b1ea] hover:bg-[#0098cc] text-white py-4 rounded-xl font-bold text-base transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                      Pagar con MercadoPago
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-gray-400">
                  Seras redirigido a MercadoPago para completar el pago de forma segura.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
