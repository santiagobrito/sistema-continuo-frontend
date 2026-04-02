"use client";

import { useState, useMemo } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { formatStorePrice } from "@/lib/utils/format";
import Link from "next/link";

// All shipping options with zone restrictions and descriptions
const ALL_SHIPPING_OPTIONS = [
  {
    id: "local_pickup",
    label: "Retiro en local",
    price: 0,
    zones: ["all"],
    desc: "Av. Rivadavia 17002, Haedo. Te avisamos cuando tu pedido este listo. Lunes a viernes 9-13 y 14-18hs.",
    time: "Disponible en 24-48hs habiles",
  },
  {
    id: "moto_caba",
    label: "Moto CABA",
    price: 4836,
    zones: ["C"],
    desc: "Envio en moto a domicilio dentro de CABA. Costo por 1 bulto. Si no entra en moto, tendra recargo.",
    time: "Despacho en 24-48hs habiles",
    minOrder: 25000,
  },
  {
    id: "moto_gba1",
    label: "Moto GBA Zona 1",
    price: 7728,
    zones: ["B"],
    desc: "San Fernando, San Isidro, San Martin, Vicente Lopez, Hurlingham, Ituzaingo, Moron, 3 de Febrero, La Matanza Norte, Lomas de Zamora, Lanus, Avellaneda.",
    time: "Despacho en 24-48hs habiles",
    minOrder: 25000,
  },
  {
    id: "moto_gba2",
    label: "Moto GBA Zona 2",
    price: 10725,
    zones: ["B"],
    desc: "Tigre, Malvinas Argentinas, Jose C. Paz, San Miguel, Moreno, Merlo, Ezeiza, Esteban Echeverria, Almirante Brown, Florencio Varela, Berazategui, Quilmes, Escobar, Pilar, La Plata, Berisso.",
    time: "Despacho en 24-48hs habiles",
    minOrder: 25000,
  },
  {
    id: "correo_domicilio",
    label: "Correo Argentino a domicilio",
    price: 0,
    zones: ["all"],
    desc: "Envio a domicilio por Correo Argentino. El costo se cotiza al confirmar el pedido y se informa por email/WhatsApp.",
    time: "Despacho en 3 dias habiles. Entrega 3-7 dias habiles segun destino",
  },
  {
    id: "correo_sucursal",
    label: "Correo Argentino a sucursal",
    price: 0,
    zones: ["all"],
    desc: "Envio a sucursal de Correo Argentino mas cercana. Mas economico que a domicilio. Costo a cotizar.",
    time: "Despacho en 3 dias habiles",
  },
  {
    id: "transporte",
    label: "Transporte al interior",
    price: 3061,
    zones: ["interior"],
    desc: "Se cobra costo de despacho ($3.061). El flete del transporte se abona al retirar en destino (terminal o sucursal). Indicar transporte de preferencia.",
    time: "Despacho en 3 dias habiles",
  },
];

const PROVINCIAS = [
  { code: "C", name: "CABA", zone: "caba" },
  { code: "B", name: "Buenos Aires", zone: "gba" },
  { code: "K", name: "Catamarca", zone: "interior" }, { code: "H", name: "Chaco", zone: "interior" },
  { code: "U", name: "Chubut", zone: "interior" }, { code: "X", name: "Cordoba", zone: "interior" },
  { code: "W", name: "Corrientes", zone: "interior" }, { code: "E", name: "Entre Rios", zone: "interior" },
  { code: "P", name: "Formosa", zone: "interior" }, { code: "Y", name: "Jujuy", zone: "interior" },
  { code: "L", name: "La Pampa", zone: "interior" }, { code: "F", name: "La Rioja", zone: "interior" },
  { code: "M", name: "Mendoza", zone: "interior" }, { code: "N", name: "Misiones", zone: "interior" },
  { code: "Q", name: "Neuquen", zone: "interior" }, { code: "R", name: "Rio Negro", zone: "interior" },
  { code: "A", name: "Salta", zone: "interior" }, { code: "J", name: "San Juan", zone: "interior" },
  { code: "D", name: "San Luis", zone: "interior" }, { code: "Z", name: "Santa Cruz", zone: "interior" },
  { code: "S", name: "Santa Fe", zone: "interior" }, { code: "G", name: "Santiago del Estero", zone: "interior" },
  { code: "V", name: "Tierra del Fuego", zone: "interior" }, { code: "T", name: "Tucuman", zone: "interior" },
];

export default function CheckoutPage() {
  const { cart } = useCart();
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "", dni_cuit: "",
    address_1: "", city: "", state: "", postcode: "",
  });
  const [shippingMethod, setShippingMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Filter shipping options based on selected province
  const availableShipping = useMemo(() => {
    const province = formData.state;
    if (!province) return [];

    return ALL_SHIPPING_OPTIONS.filter((opt) => {
      if (opt.zones.includes("all")) return true;
      if (opt.zones.includes(province)) return true;
      if (opt.zones.includes("interior") && !["C", "B"].includes(province)) return true;
      return false;
    });
  }, [formData.state]);

  // Auto-select first available shipping when province changes
  useMemo(() => {
    if (availableShipping.length > 0 && !availableShipping.find((o) => o.id === shippingMethod)) {
      setShippingMethod(availableShipping[0].id);
    }
  }, [availableShipping, shippingMethod]);

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

  const selectedShipping = ALL_SHIPPING_OPTIONS.find((o) => o.id === shippingMethod);
  const needsAddress = shippingMethod !== "local_pickup" && shippingMethod !== "";
  const shippingCost = selectedShipping?.price || 0;
  const subtotal = parseInt(cart.totals.total_items || "0");
  const total = subtotal + shippingCost;

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shippingMethod) { setError("Selecciona un metodo de envio"); return; }
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
        <div className="flex items-center gap-2 mb-6">
          <Link href="/carrito" className="text-sm text-gray-500 hover:text-[#013d5a] cursor-pointer">Carrito</Link>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="text-sm font-semibold text-gray-900">Finalizar compra</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* 1. Contact */}
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

              {/* 2. Address + Shipping */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#013d5a] text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                  Direccion y envio
                </h2>

                {/* Province first — determines available shipping */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <select required value={formData.state} onChange={(e) => { updateField("state", e.target.value); setShippingMethod(""); }} className={`${inputClass} cursor-pointer font-medium`}>
                    <option value="">Provincia *</option>
                    {PROVINCIAS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                  <input placeholder="Ciudad *" value={formData.city} onChange={(e) => updateField("city", e.target.value)} className={inputClass} />
                </div>

                {/* Address fields (hidden for local pickup) */}
                {formData.state && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <input placeholder="Direccion" value={formData.address_1} onChange={(e) => updateField("address_1", e.target.value)} className={`${inputClass} sm:col-span-2`} />
                    <input placeholder="Codigo postal" value={formData.postcode} onChange={(e) => updateField("postcode", e.target.value)} className={inputClass} />
                  </div>
                )}

                {/* Shipping methods — filtered by province */}
                {formData.state ? (
                  <>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Metodos de envio disponibles para {PROVINCIAS.find(p => p.code === formData.state)?.name}
                    </p>
                    <div className="space-y-2">
                      {availableShipping.map((opt) => {
                        const isSelected = shippingMethod === opt.id;
                        const meetsMinimum = !opt.minOrder || subtotal >= opt.minOrder;

                        return (
                          <label
                            key={opt.id}
                            className={`block rounded-xl border cursor-pointer transition-all ${
                              !meetsMinimum
                                ? "border-gray-100 opacity-50 cursor-not-allowed"
                                : isSelected
                                ? "border-[#013d5a] bg-[#013d5a]/5"
                                : "border-gray-100 hover:border-gray-200"
                            }`}
                          >
                            <div className="flex items-start gap-3 p-3.5">
                              <input
                                type="radio"
                                name="shipping"
                                value={opt.id}
                                checked={isSelected}
                                onChange={() => setShippingMethod(opt.id)}
                                disabled={!meetsMinimum}
                                className="w-4 h-4 mt-0.5 text-[#013d5a] cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                                  <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">
                                    {opt.price === 0 ? (opt.id === "local_pickup" ? "Gratis" : "A cotizar") : `$${opt.price.toLocaleString("es-AR")}`}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.desc}</p>
                                <p className="text-[10px] text-[#013d5a] font-medium mt-1">{opt.time}</p>
                                {opt.minOrder && !meetsMinimum && (
                                  <p className="text-[10px] text-red-500 mt-1">Monto minimo: ${opt.minOrder.toLocaleString("es-AR")}</p>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400">Selecciona tu provincia para ver los metodos de envio disponibles</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
                <h2 className="font-bold text-gray-900 mb-4">Tu pedido</h2>

                <div className="space-y-2.5 mb-4 max-h-60 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.key} className="flex items-center gap-3">
                      <div className="w-10 h-10 relative flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                        {item.images[0] && <img src={item.images[0].thumbnail || item.images[0].src} alt="" className="w-full h-full object-contain" />}
                        <span className="absolute -top-1 -right-1 bg-gray-700 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{item.quantity}</span>
                      </div>
                      <p className="text-xs text-gray-700 flex-1 line-clamp-1">{item.name}</p>
                      <p className="text-xs font-bold text-gray-900 flex-shrink-0">{formatStorePrice(item.totals.line_total)}</p>
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
                    <span className="font-medium">
                      {!shippingMethod ? "—" : shippingCost > 0 ? `$${shippingCost.toLocaleString("es-AR")}` : selectedShipping?.id === "local_pickup" ? "Gratis" : "A cotizar"}
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
                  disabled={submitting || !shippingMethod}
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
