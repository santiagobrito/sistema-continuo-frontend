"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  company: string;
  phone?: string;
  email?: string;
  label?: string;
}

interface Profile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  billing: Address;
  shipping: Address;
  extra_addresses: (Address & { label: string })[];
  dni_cuit: string;
}

const PROVINCIAS = [
  { code: "C", name: "CABA" },
  { code: "B", name: "Buenos Aires" },
  { code: "K", name: "Catamarca" }, { code: "H", name: "Chaco" },
  { code: "U", name: "Chubut" }, { code: "X", name: "Cordoba" },
  { code: "W", name: "Corrientes" }, { code: "E", name: "Entre Rios" },
  { code: "P", name: "Formosa" }, { code: "Y", name: "Jujuy" },
  { code: "L", name: "La Pampa" }, { code: "F", name: "La Rioja" },
  { code: "M", name: "Mendoza" }, { code: "N", name: "Misiones" },
  { code: "Q", name: "Neuquen" }, { code: "R", name: "Rio Negro" },
  { code: "A", name: "Salta" }, { code: "J", name: "San Juan" },
  { code: "D", name: "San Luis" }, { code: "Z", name: "Santa Cruz" },
  { code: "S", name: "Santa Fe" }, { code: "G", name: "Santiago del Estero" },
  { code: "V", name: "Tierra del Fuego" }, { code: "T", name: "Tucuman" },
];

const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#013d5a] focus:ring-2 focus:ring-[#013d5a]/10 transition-colors";

export default function PerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "billing" | "shipping">("personal");

  useEffect(() => {
    if (!authLoading && !user) router.push("/iniciar-sesion");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          billing: profile.billing,
          shipping: profile.shipping,
          extra_addresses: profile.extra_addresses,
          dni_cuit: profile.dni_cuit,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }
      setMessage({ type: "success", text: "Datos guardados correctamente" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error" });
    } finally {
      setSaving(false);
    }
  }

  function updateBilling(field: string, value: string) {
    if (!profile) return;
    setProfile({ ...profile, billing: { ...profile.billing, [field]: value } });
  }

  function updateShipping(field: string, value: string) {
    if (!profile) return;
    setProfile({ ...profile, shipping: { ...profile.shipping, [field]: value } });
  }

  function addExtraAddress() {
    if (!profile) return;
    setProfile({
      ...profile,
      extra_addresses: [
        ...profile.extra_addresses,
        { label: `Direccion ${profile.extra_addresses.length + 2}`, first_name: "", last_name: "", address_1: "", address_2: "", city: "", state: "", postcode: "", country: "AR", company: "" },
      ],
    });
  }

  function removeExtraAddress(index: number) {
    if (!profile) return;
    setProfile({
      ...profile,
      extra_addresses: profile.extra_addresses.filter((_, i) => i !== index),
    });
  }

  function updateExtraAddress(index: number, field: string, value: string) {
    if (!profile) return;
    const updated = [...profile.extra_addresses];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, extra_addresses: updated });
  }

  if (authLoading || loading || !user) {
    return (
      <main className="bg-gray-50 min-h-screen flex items-center justify-center">
        <svg className="w-8 h-8 text-[#013d5a] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No se pudo cargar el perfil.</p>
      </main>
    );
  }

  const tabs = [
    { id: "personal" as const, label: "Datos personales" },
    { id: "billing" as const, label: "Facturacion" },
    { id: "shipping" as const, label: "Direcciones de envio" },
  ];

  return (
    <main className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/mi-cuenta" className="hover:text-[#013d5a]">Mi cuenta</Link>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Perfil</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi perfil</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          {/* Personal */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={profile.email} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
                <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input value={profile.billing.phone || ""} onChange={(e) => updateBilling("phone", e.target.value)} className={inputClass} placeholder="Ej: 1130793862" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI / CUIT</label>
                <input value={profile.dni_cuit} onChange={(e) => setProfile({ ...profile, dni_cuit: e.target.value })} className={inputClass} placeholder="Ej: 20-12345678-9" />
              </div>
            </div>
          )}

          {/* Billing */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">Datos de facturacion. Se usan para generar la factura de compra.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input value={profile.billing.first_name} onChange={(e) => updateBilling("first_name", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input value={profile.billing.last_name} onChange={(e) => updateBilling("last_name", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa (opcional)</label>
                <input value={profile.billing.company} onChange={(e) => updateBilling("company", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
                <input value={profile.billing.address_1} onChange={(e) => updateBilling("address_1", e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input value={profile.billing.city} onChange={(e) => updateBilling("city", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                  <select value={profile.billing.state} onChange={(e) => updateBilling("state", e.target.value)} className={`${inputClass} cursor-pointer`}>
                    <option value="">Seleccionar</option>
                    {PROVINCIAS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codigo postal</label>
                  <input value={profile.billing.postcode} onChange={(e) => updateBilling("postcode", e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email de facturacion</label>
                <input value={profile.billing.email || ""} onChange={(e) => updateBilling("email", e.target.value)} className={inputClass} placeholder="Si es distinto al de la cuenta" />
              </div>
            </div>
          )}

          {/* Shipping */}
          {activeTab === "shipping" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Direccion principal de envio</h3>
                <AddressForm address={profile.shipping} onChange={(f, v) => updateShipping(f, v)} />
              </div>

              {/* Extra addresses */}
              {profile.extra_addresses.map((addr, i) => (
                <div key={i} className="border-t border-gray-100 pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      value={addr.label || `Direccion ${i + 2}`}
                      onChange={(e) => updateExtraAddress(i, "label", e.target.value)}
                      className="font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                    />
                    <button onClick={() => removeExtraAddress(i)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                      Eliminar
                    </button>
                  </div>
                  <AddressForm address={addr} onChange={(f, v) => updateExtraAddress(i, f, v)} />
                </div>
              ))}

              <button
                onClick={addExtraAddress}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#013d5a] hover:text-[#013d5a] transition-colors cursor-pointer"
              >
                + Agregar otra direccion de envio
              </button>
            </div>
          )}
        </div>

        {/* Message + Save */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
            {message.text}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full py-3.5 bg-[#013d5a] text-white rounded-xl font-semibold text-sm hover:bg-[#01567a] transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </main>
  );
}

function AddressForm({ address, onChange }: { address: Address; onChange: (field: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input value={address.first_name} onChange={(e) => onChange("first_name", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
          <input value={address.last_name} onChange={(e) => onChange("last_name", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
        <input value={address.address_1} onChange={(e) => onChange("address_1", e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input value={address.city} onChange={(e) => onChange("city", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
          <select value={address.state} onChange={(e) => onChange("state", e.target.value)} className={`${inputClass} cursor-pointer`}>
            <option value="">Seleccionar</option>
            {PROVINCIAS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Codigo postal</label>
          <input value={address.postcode} onChange={(e) => onChange("postcode", e.target.value)} className={inputClass} />
        </div>
      </div>
    </div>
  );
}
