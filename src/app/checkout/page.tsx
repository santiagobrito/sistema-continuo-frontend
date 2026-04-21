"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatStorePrice } from "@/lib/utils/format";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { getGclid } from "@/components/analytics/GclidCapture";

// All shipping options with zone restrictions and descriptions.
// Orden: opciones a domicilio/sucursal primero (mayor uso), retiro y transporte al final.
const ALL_SHIPPING_OPTIONS = [
  {
    id: "correo_domicilio",
    label: "Correo Argentino a domicilio",
    price: 0,
    zones: ["all"],
    desc: "Envío a domicilio por Correo Argentino. Costo calculado según peso y destino.",
    time: "Despacho en 3 días hábiles. Entrega 3-7 días hábiles según destino",
  },
  {
    id: "correo_sucursal",
    label: "Correo Argentino a sucursal",
    price: 0,
    zones: ["all"],
    desc: "Retiro en sucursal de Correo Argentino más cercana. Más económico que a domicilio.",
    time: "Despacho en 3 días hábiles",
  },
  {
    id: "moto_caba",
    label: "Moto CABA",
    price: 4836,
    zones: ["C"],
    desc: "Envío en moto a domicilio dentro de CABA. Costo por 1 bulto. Si no entra en moto, tendrá recargo.",
    time: "Despacho en 24-48hs hábiles",
    minOrder: 25000,
  },
  {
    id: "moto_gba1",
    label: "Moto GBA Zona 1",
    price: 7728,
    zones: ["B"],
    desc: "San Fernando, San Isidro, San Martín, Vicente López, Hurlingham, Ituzaingó, Morón, 3 de Febrero, La Matanza Norte, Lomas de Zamora, Lanús, Avellaneda.",
    time: "Despacho en 24-48hs hábiles",
    minOrder: 25000,
  },
  {
    id: "moto_gba2",
    label: "Moto GBA Zona 2",
    price: 10725,
    zones: ["B"],
    desc: "Tigre, Malvinas Argentinas, José C. Paz, San Miguel, Moreno, Merlo, Ezeiza, Esteban Echeverría, Almirante Brown, Florencio Varela, Berazategui, Quilmes, Escobar, Pilar, La Plata, Berisso.",
    time: "Despacho en 24-48hs hábiles",
    minOrder: 25000,
  },
  {
    id: "transporte",
    label: "Transporte al interior",
    price: 3061,
    zones: ["interior"],
    desc: "Se cobra costo de despacho ($3.061). El flete del transporte se abona al retirar en destino (terminal o sucursal). Indicar transporte de preferencia.",
    time: "Despacho en 3 días hábiles",
  },
  {
    id: "local_pickup",
    label: "Retiro en local",
    price: 0,
    zones: ["all"],
    desc: "Av. Rivadavia 17002, Haedo. Te avisamos cuando tu pedido esté listo. Lunes a viernes 9-13 y 14-18hs.",
    time: "Disponible en 24-48hs hábiles",
  },
];

const PROVINCIAS = [
  { code: "C", name: "CABA", zone: "caba" },
  { code: "B", name: "Buenos Aires", zone: "gba" },
  { code: "K", name: "Catamarca", zone: "interior" }, { code: "H", name: "Chaco", zone: "interior" },
  { code: "U", name: "Chubut", zone: "interior" }, { code: "X", name: "Córdoba", zone: "interior" },
  { code: "W", name: "Corrientes", zone: "interior" }, { code: "E", name: "Entre Ríos", zone: "interior" },
  { code: "P", name: "Formosa", zone: "interior" }, { code: "Y", name: "Jujuy", zone: "interior" },
  { code: "L", name: "La Pampa", zone: "interior" }, { code: "F", name: "La Rioja", zone: "interior" },
  { code: "M", name: "Mendoza", zone: "interior" }, { code: "N", name: "Misiones", zone: "interior" },
  { code: "Q", name: "Neuquén", zone: "interior" }, { code: "R", name: "Río Negro", zone: "interior" },
  { code: "A", name: "Salta", zone: "interior" }, { code: "J", name: "San Juan", zone: "interior" },
  { code: "D", name: "San Luis", zone: "interior" }, { code: "Z", name: "Santa Cruz", zone: "interior" },
  { code: "S", name: "Santa Fe", zone: "interior" }, { code: "G", name: "Santiago del Estero", zone: "interior" },
  { code: "V", name: "Tierra del Fuego", zone: "interior" }, { code: "T", name: "Tucumán", zone: "interior" },
];

export default function CheckoutPage() {
  const { cart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "", phone: "", dni_cuit: "",
    address_1: "", city: "", state: "", postcode: "",
  });
  const [shippingMethod, setShippingMethod] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [agencyQuery, setAgencyQuery] = useState("");
  const [agencies, setAgencies] = useState<
    Array<{ id: string; name: string; address: string; city: string; zip: string; schedule: string }>
  >([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mercadopago" | "transferencia" | "efectivo">("mercadopago");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
    label: string;
    free_shipping: boolean;
  } | null>(null);

  // PAQ.AR online quote — se recalcula cuando cambia CP/provincia/cart.
  // null: no cotizado aún; {loading:true}: en vuelo; {domicilio,sucursal}: precios firmes (o fallback).
  const [paqarQuote, setPaqarQuote] = useState<
    | null
    | { loading: true }
    | {
        loading: false;
        domicilio?: { total: number; warning?: string };
        sucursal?: { total: number; warning?: string };
        service?: string;
        error?: string;
      }
  >(null);
  const mpCheckoutRef = useRef<HTMLDivElement>(null);
  const [mpSdkReady, setMpSdkReady] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Auto-fill from user profile if logged in
  useEffect(() => {
    if (profileLoaded) return;
    fetch("/api/auth/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.profile) return;
        const p = d.profile;
        setFormData((prev) => ({
          first_name: prev.first_name || p.billing.first_name || p.first_name || "",
          last_name: prev.last_name || p.billing.last_name || p.last_name || "",
          email: prev.email || p.billing.email || p.email || "",
          phone: prev.phone || p.billing.phone || "",
          dni_cuit: prev.dni_cuit || p.dni_cuit || "",
          address_1: prev.address_1 || p.shipping.address_1 || p.billing.address_1 || "",
          city: prev.city || p.shipping.city || p.billing.city || "",
          state: prev.state || p.shipping.state || p.billing.state || "",
          postcode: prev.postcode || p.shipping.postcode || p.billing.postcode || "",
        }));
        setProfileLoaded(true);
      })
      .catch(() => {});
  }, [profileLoaded]);

  // Track abandoned cart when email is filled (fire once)
  const [cartTracked, setCartTracked] = useState(false);
  useEffect(() => {
    if (cartTracked || !formData.email || !formData.email.includes("@") || !cart) return;
    const timer = setTimeout(() => {
      fetch("/api/abandoned-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          phone: formData.phone,
          items: cart.items.map((i) => ({ name: i.name, quantity: i.quantity, price: parseInt(i.prices.price) })),
          total: parseInt(cart.totals.total_items || "0"),
        }),
      }).catch(() => {});
      setCartTracked(true);
    }, 2000); // Wait 2s after typing email to avoid spam
    return () => clearTimeout(timer);
  }, [formData.email, formData.first_name, formData.last_name, formData.phone, cart, cartTracked]);

  // Cotización online contra /api/paqar/quote cuando cambia CP/provincia/carrito.
  // Debounced 500ms para no pegar en cada keystroke del CP.
  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    if (!formData.state || !formData.postcode || formData.postcode.length < 4) {
      setPaqarQuote(null);
      return;
    }

    setPaqarQuote({ loading: true });
    const timer = setTimeout(async () => {
      try {
        const items = cart.items.map((it) => ({
          id: String(it.id),
          name: it.name,
          quantity: it.quantity,
          weight: Number((it as unknown as { weight?: string }).weight || 500),
          height: 10,
          width: 10,
          depth: 10,
          price: parseInt(it.prices.price) / 100,
          category: "general",
        }));

        const res = await fetch("/api/paqar/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            destState: formData.state,
            destZip: formData.postcode,
            deliveryTypes: ["homeDelivery", "agency"],
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setPaqarQuote({ loading: false, error: data.error || "No se pudo cotizar" });
          return;
        }
        const dom = data.options.find((o: { deliveryType: string }) => o.deliveryType === "homeDelivery");
        const suc = data.options.find((o: { deliveryType: string }) => o.deliveryType === "agency");
        setPaqarQuote({
          loading: false,
          domicilio: dom ? { total: dom.total, warning: dom.warning } : undefined,
          sucursal: suc ? { total: suc.total, warning: suc.warning } : undefined,
          service: data.service,
        });
      } catch (err) {
        setPaqarQuote({
          loading: false,
          error: err instanceof Error ? err.message : "Error de cotización",
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cart, formData.state, formData.postcode]);

  // Cargar sucursales cuando eligen "correo_sucursal" y hay provincia.
  // Si hay CP del cliente, el endpoint ordena por proximidad (más cercanas primero).
  useEffect(() => {
    if (shippingMethod !== "correo_sucursal" || !formData.state) {
      return;
    }
    setAgenciesLoading(true);
    const qs = new URLSearchParams({ state: formData.state });
    if (formData.postcode && formData.postcode.length >= 4) {
      qs.set("cp", formData.postcode);
    }
    fetch(`/api/paqar/agencies?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setAgencies(d.ok ? d.agencies : []);
        setAgenciesLoading(false);
      })
      .catch(() => {
        setAgencies([]);
        setAgenciesLoading(false);
      });
  }, [shippingMethod, formData.state, formData.postcode]);

  // Si cambia el método, limpiar sucursal elegida.
  useEffect(() => {
    if (shippingMethod !== "correo_sucursal") setSelectedAgencyId("");
  }, [shippingMethod]);

  const filteredAgencies = useMemo(() => {
    const q = agencyQuery.trim().toLowerCase();
    if (!q) return agencies.slice(0, 50);
    return agencies
      .filter((a) => `${a.name} ${a.address} ${a.city} ${a.zip}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [agencies, agencyQuery]);

  // Precio efectivo por opción de envío (incluye cotización online de Correo cuando aplica).
  function getShippingPrice(optId: string, basePrice: number): number {
    if (optId === "correo_domicilio") {
      return paqarQuote && "domicilio" in paqarQuote && paqarQuote.domicilio
        ? paqarQuote.domicilio.total
        : 0;
    }
    if (optId === "correo_sucursal") {
      return paqarQuote && "sucursal" in paqarQuote && paqarQuote.sucursal
        ? paqarQuote.sucursal.total
        : 0;
    }
    return basePrice;
  }

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
  const selectedShippingPrice = selectedShipping
    ? getShippingPrice(selectedShipping.id, selectedShipping.price)
    : 0;
  const shippingCost = (appliedCoupon?.free_shipping && shippingMethod) ? 0 : selectedShippingPrice;
  const subtotal = parseInt(cart.totals.total_items || "0");
  const couponDiscount = appliedCoupon?.discount_amount || 0;
  const total = Math.max(0, subtotal - couponDiscount + shippingCost);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Cupón no válido");
      } else {
        setAppliedCoupon({
          code: data.code,
          discount_amount: data.discount_amount,
          label: data.label,
          free_shipping: data.free_shipping,
        });
        setCouponInput("");
      }
    } catch {
      setCouponError("Error al validar");
    }
    setCouponLoading(false);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shippingMethod) { setError("Selecciona un método de envío"); return; }
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

      const orderPayload = {
        items,
        billing: formData,  // incluye dni_cuit; los endpoints lo persisten como meta _dni_cuit
        shipping_method: shippingMethod,
        shipping_cost: shippingCost,
        paqar_agency_id: shippingMethod === "correo_sucursal" ? selectedAgencyId : undefined,
        gclid: getGclid() || undefined,
        coupon_code: appliedCoupon?.code || undefined,
      };

      if (paymentMethod === "mercadopago") {
        const res = await fetch("/api/mercadopago/create-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al procesar el pedido");

        // Try modal checkout, fallback to redirect
        const mpPublicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || "TEST-d8548e3c-e516-4a3e-ab89-d3b2d9c45ab6";
        if (mpSdkReady && (window as unknown as Record<string, unknown>).MercadoPago) {
          try {
            const mp = new ((window as unknown as Record<string, { new(key: string, opts: Record<string, unknown>): unknown }>).MercadoPago)(mpPublicKey, { locale: "es-AR" });
            (mp as Record<string, (opts: Record<string, unknown>) => void>).checkout({
              preference: { id: data.preferenceId },
              autoOpen: true,
            });
            setSubmitting(false);
            return;
          } catch {
            // Fallback to redirect
          }
        }
        window.location.href = data.sandboxInitPoint || data.initPoint;
      } else {
        const res = await fetch("/api/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...orderPayload, payment_method: paymentMethod }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al crear el pedido");
        window.location.href = `/pedido-confirmado?order=${data.orderId}&payment=${paymentMethod}&email=${encodeURIComponent(formData.email)}&shipping=${encodeURIComponent(shippingMethod)}`;
      }
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

        {/* Login / guest banner */}
        {!authLoading && (
          user ? (
            <div className="mb-5 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
              <span className="text-green-800">
                Hola <strong>{user.name || user.email}</strong>, tus datos se completaron automáticamente.
              </span>
              <Link href="/mi-cuenta/perfil" className="text-green-700 hover:text-green-900 underline font-medium">
                Editar datos
              </Link>
            </div>
          ) : (
            <div className="mb-5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
              <span className="text-gray-700">
                ¿Ya tenés cuenta? Iniciá sesión para completar tus datos automáticamente.
              </span>
              <Link
                href={`/iniciar-sesion?redirect=${encodeURIComponent("/checkout")}`}
                className="bg-[#013d5a] text-white px-4 py-1.5 rounded-md font-semibold hover:bg-[#012a42] transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          )
        )}

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
                  <input required type="tel" placeholder="Teléfono *" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className={inputClass} />
                  <input required placeholder="DNI / CUIT *" value={formData.dni_cuit} onChange={(e) => updateField("dni_cuit", e.target.value)} className={`${inputClass} sm:col-span-2`} />
                </div>
              </div>

              {/* 2. Address + Shipping */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#013d5a] text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                  Dirección y envío
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
                    <input placeholder="Dirección" value={formData.address_1} onChange={(e) => updateField("address_1", e.target.value)} className={`${inputClass} sm:col-span-2`} />
                    <input placeholder="Código postal" value={formData.postcode} onChange={(e) => updateField("postcode", e.target.value)} className={inputClass} />
                  </div>
                )}

                {/* Shipping methods — filtered by province */}
                {formData.state ? (
                  <>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Métodos de envío disponibles para {PROVINCIAS.find(p => p.code === formData.state)?.name}
                    </p>
                    <div className="space-y-2">
                      {availableShipping.map((opt) => {
                        const isSelected = shippingMethod === opt.id;
                        const meetsMinimum = !opt.minOrder || subtotal >= opt.minOrder;
                        const isCorreo = opt.id === "correo_domicilio" || opt.id === "correo_sucursal";
                        const livePrice = getShippingPrice(opt.id, opt.price);
                        const quoteLoading = isCorreo && paqarQuote && "loading" in paqarQuote && paqarQuote.loading;
                        const needsCp = isCorreo && (!formData.postcode || formData.postcode.length < 4);
                        const quoteWarning =
                          isCorreo && paqarQuote && !("loading" in paqarQuote && paqarQuote.loading)
                            ? (opt.id === "correo_domicilio" && "domicilio" in paqarQuote ? paqarQuote.domicilio?.warning :
                               opt.id === "correo_sucursal" && "sucursal" in paqarQuote ? paqarQuote.sucursal?.warning : undefined)
                            : undefined;

                        let priceLabel: React.ReactNode;
                        if (livePrice > 0) {
                          priceLabel = `$${livePrice.toLocaleString("es-AR")}`;
                        } else if (opt.id === "local_pickup") {
                          priceLabel = "Gratis";
                        } else if (needsCp) {
                          priceLabel = <span className="text-xs text-gray-400">Ingresá el CP</span>;
                        } else if (quoteLoading) {
                          priceLabel = <span className="text-xs text-gray-400">Cotizando…</span>;
                        } else if (opt.price === 0) {
                          priceLabel = "A cotizar";
                        } else {
                          priceLabel = `$${opt.price.toLocaleString("es-AR")}`;
                        }

                        const isExpanded = opt.id === "correo_sucursal" && isSelected;

                        // Clases del contenedor externo. Cuando está expanded (sucursal seleccionada),
                        // el border/rounded/bg viven en el contenedor y los hijos (label + selector)
                        // quedan sin border propio. Así evitamos cualquier gap entre ambos bloques.
                        const wrapperClass = isExpanded
                          ? "rounded-xl border border-[#013d5a] bg-[#013d5a]/5 overflow-hidden"
                          : !meetsMinimum
                          ? "rounded-xl border border-gray-100 opacity-50"
                          : isSelected
                          ? "rounded-xl border border-[#013d5a] bg-[#013d5a]/5"
                          : "rounded-xl border border-gray-100 hover:border-gray-200";

                        return (
                          <div key={opt.id} className={wrapperClass}>
                            <label className={`block ${!meetsMinimum ? "cursor-not-allowed" : "cursor-pointer"} transition-all`}>
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
                                    <span className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">{priceLabel}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.desc}</p>
                                  <p className="text-[10px] text-[#013d5a] font-medium mt-1">{opt.time}</p>
                                  {quoteWarning && (
                                    <p className="text-[10px] text-amber-600 mt-1">{quoteWarning}</p>
                                  )}
                                  {opt.minOrder && !meetsMinimum && (
                                    <p className="text-[10px] text-red-500 mt-1">Monto mínimo: ${opt.minOrder.toLocaleString("es-AR")}</p>
                                  )}
                                </div>
                              </div>
                            </label>

                            {/* Selector de sucursal inline cuando está expanded */}
                            {isExpanded && (
                              <div className="border-t border-[#013d5a]/30 px-3.5 pb-3.5 pt-3">
                                <div className="pl-7">
                                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                                    Elegí tu sucursal *
                                  </label>
                                  <input
                                    type="text"
                                    value={agencyQuery}
                                    onChange={(e) => setAgencyQuery(e.target.value)}
                                    placeholder="Buscar por ciudad, barrio, dirección o CP"
                                    className={`${inputClass} mb-2 bg-white`}
                                  />
                                  {agenciesLoading ? (
                                    <p className="text-xs text-gray-400 py-3 text-center">Cargando sucursales…</p>
                                  ) : agencies.length === 0 ? (
                                    <p className="text-xs text-red-500 py-3 text-center">No se pudieron cargar las sucursales. Probá recargar.</p>
                                  ) : (
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
                                      {filteredAgencies.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-4 text-center">Sin resultados — probá otra búsqueda</p>
                                      ) : (
                                        filteredAgencies.map((a) => {
                                          const sel = selectedAgencyId === a.id;
                                          return (
                                            <label
                                              key={a.id}
                                              className={`flex items-start gap-2 p-2.5 cursor-pointer transition-colors ${sel ? "bg-[#013d5a]/10" : "hover:bg-gray-50"}`}
                                            >
                                              <input
                                                type="radio"
                                                name="agency"
                                                value={a.id}
                                                checked={sel}
                                                onChange={() => setSelectedAgencyId(a.id)}
                                                className="mt-0.5 text-[#013d5a]"
                                              />
                                              <div className="text-xs">
                                                <p className="font-semibold text-gray-900">{a.name}</p>
                                                <p className="text-gray-500">{a.address} — {a.city} ({a.zip})</p>
                                                <p className="text-gray-400 text-[10px] mt-0.5">{a.schedule}</p>
                                              </div>
                                            </label>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                  {agencies.length > 50 && !agencyQuery && (
                                    <p className="text-[10px] text-gray-400 mt-1">Mostrando 50 de {agencies.length} sucursales — usá el buscador para filtrar.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-400">Selecciona tu provincia para ver los métodos de envío disponibles</p>
                  </div>
                )}
              </div>

              {/* 3. Payment method */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[#013d5a] text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
                  Medio de pago
                </h2>
                <div className="space-y-2">
                  {[
                    {
                      id: "mercadopago" as const,
                      label: "MercadoPago",
                      desc: "Tarjeta de crédito/débito hasta 12 cuotas, dinero en cuenta MP, Rapipago, Pago Fácil",
                      icon: (
                        <svg className="w-5 h-5 text-[#009ee3]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      ),
                    },
                    {
                      id: "transferencia" as const,
                      label: "Transferencia Bancaria",
                      desc: "Transferencia o depósito. Te enviamos los datos por email al confirmar el pedido.",
                      icon: (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
                      ),
                    },
                    {
                      id: "efectivo" as const,
                      label: "Efectivo en Local",
                      desc: "Pagas al retirar en Av. Rivadavia 17002, Haedo. Lunes a viernes 9-13 y 14-18hs.",
                      icon: (
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                      ),
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`block rounded-xl border cursor-pointer transition-all ${
                        paymentMethod === opt.id
                          ? "border-[#013d5a] bg-[#013d5a]/5"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-start gap-3 p-3.5">
                        <input
                          type="radio"
                          name="payment"
                          value={opt.id}
                          checked={paymentMethod === opt.id}
                          onChange={() => setPaymentMethod(opt.id)}
                          className="w-4 h-4 mt-0.5 text-[#013d5a] cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {opt.icon}
                            <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
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
                        {item.images[0] && <Image src={item.images[0].thumbnail || item.images[0].src} alt={item.name} fill className="object-contain" sizes="40px" />}
                        <span className="absolute -top-1 -right-1 bg-gray-700 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">{item.quantity}</span>
                      </div>
                      <p className="text-xs text-gray-700 flex-1 line-clamp-1">{item.name}</p>
                      <p className="text-xs font-bold text-gray-900 flex-shrink-0">{formatStorePrice(item.totals.line_total)}</p>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="border-t border-gray-100 pt-3 mb-3">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-xs font-bold text-green-700 uppercase">{appliedCoupon.code}</span>
                        <span className="text-xs text-green-600 ml-2">{appliedCoupon.label}</span>
                      </div>
                      <button onClick={removeCoupon} className="text-xs text-red-500 hover:text-red-700 cursor-pointer font-medium">Quitar</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                        placeholder="Código de descuento"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#013d5a]"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }}
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {couponLoading ? "..." : "Aplicar"}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatStorePrice(cart.totals.total_items)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({appliedCoupon.code})</span>
                      <span className="font-medium">-${couponDiscount.toLocaleString("es-AR")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Envío</span>
                    <span className="font-medium">
                      {!shippingMethod
                        ? "—"
                        : appliedCoupon?.free_shipping
                        ? <span className="text-green-600">Gratis (cupón)</span>
                        : shippingCost > 0
                        ? `$${shippingCost.toLocaleString("es-AR")}`
                        : selectedShipping?.id === "local_pickup"
                        ? "Gratis"
                        : (selectedShipping?.id === "correo_domicilio" || selectedShipping?.id === "correo_sucursal")
                        ? (paqarQuote && "loading" in paqarQuote && paqarQuote.loading ? "Cotizando…" : "A cotizar")
                        : "A cotizar"}
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
                  disabled={
                    submitting ||
                    !shippingMethod ||
                    ((shippingMethod === "correo_domicilio" || shippingMethod === "correo_sucursal") && selectedShippingPrice <= 0) ||
                    (shippingMethod === "correo_sucursal" && !selectedAgencyId)
                  }
                  className={`mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-base transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === "mercadopago"
                      ? "bg-[#009ee3] hover:bg-[#0087c9] text-white"
                      : "bg-[#013d5a] hover:bg-[#01567a] text-white"
                  }`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Procesando...
                    </>
                  ) : paymentMethod === "mercadopago" ? (
                    "Pagar con MercadoPago"
                  ) : paymentMethod === "transferencia" ? (
                    "Confirmar pedido — Transferencia"
                  ) : (
                    "Confirmar pedido — Pago en local"
                  )}
                </button>

                {!shippingMethod && !submitting && (
                  <p className="mt-2 text-center text-xs text-amber-600 font-medium">
                    {!formData.state
                      ? "Selecciona tu provincia para elegir el método de envío"
                      : "Selecciona un método de envío para continuar"}
                  </p>
                )}
                {(shippingMethod === "correo_domicilio" || shippingMethod === "correo_sucursal") && selectedShippingPrice <= 0 && !submitting && (
                  <p className="mt-2 text-center text-xs text-amber-600 font-medium">
                    {!formData.postcode || formData.postcode.length < 4
                      ? "Ingresá tu código postal para cotizar el envío"
                      : paqarQuote && "loading" in paqarQuote && paqarQuote.loading
                      ? "Cotizando envío…"
                      : "No pudimos cotizar el envío, probá otro método o contactanos"}
                  </p>
                )}
                {shippingMethod === "correo_sucursal" && selectedShippingPrice > 0 && !selectedAgencyId && !submitting && (
                  <p className="mt-2 text-center text-xs text-amber-600 font-medium">
                    Elegí una sucursal de Correo Argentino para continuar
                  </p>
                )}

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {paymentMethod === "mercadopago"
                    ? "Compra 100% segura — Checkout MercadoPago"
                    : "Compra segura — Recibirás un email con los detalles"}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        onLoad={() => setMpSdkReady(true)}
        strategy="lazyOnload"
      />
    </main>
  );
}
