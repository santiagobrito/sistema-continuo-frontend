"use client";

import { useState, useMemo } from "react";
import { formatPrice } from "@/lib/utils/format";
import type { ProductVariation } from "@/lib/wordpress/types";

interface Props {
  variations: ProductVariation[];
  onSelect: (variation: ProductVariation | null) => void;
}

// Known color slugs → hex for swatches
const COLOR_MAP: Record<string, string> = {
  // Básicos
  negro: "#000", black: "#000",
  blanco: "#fff", white: "#fff",
  rojo: "#dc2626", red: "#dc2626",
  "rojo-claro": "#ef4444",
  azul: "#2563eb", blue: "#2563eb",
  "azul-marino": "#1e3a5f",
  "azul-ceniza": "#708090",
  "azul-electrico": "#0066ff",
  "azul-profundo": "#003366",
  "azul-royal": "#4169e1",
  verde: "#16a34a", green: "#16a34a",
  "verde-fluo": "#39ff14",
  "verde-agua": "#00cccc",
  "verde-claro": "#90ee90",
  "verde-leal": "#2e8b57",
  "verde-manzana": "#8db600",
  "verde-militar": "#4d7c0f",
  "verde-oliva": "#6b8e23",
  "verde-oscuro": "#2d5a27",
  amarillo: "#eab308", yellow: "#eab308",
  "amarillo-azufre": "#e8e000",
  "amarillo-fluo": "#ccff00",
  "amarillo-limon": "#fff44f",
  "amarillo-oro": "#ffd700",
  naranja: "#ea580c", orange: "#ea580c",
  "naranja-fluo": "#ff6600",
  rosa: "#f472b6", pink: "#f472b6",
  "rosa-ceniza": "#c9a9a6",
  "rosa-fluo": "#ff69b4",
  fucsia: "#e91e90",
  gris: "#6b7280", gray: "#6b7280", grey: "#6b7280",
  "gris-oscuro": "#374151",
  "gris-plata": "#c0c0c0",
  marron: "#92400e", brown: "#92400e",
  "marron-oscuro": "#5c3317",
  violeta: "#7c3aed", purple: "#7c3aed",
  celeste: "#38bdf8", "celeste-cielo": "#38bdf8",
  bordo: "#7f1d1d", burgundy: "#7f1d1d",
  beige: "#d4c5a9",
  cian: "#06b6d4", cyan: "#06b6d4",
  magenta: "#db2777",
  "magenta-light": "#f472b6",
  "cian-light": "#67e8f9", "cyan-light": "#67e8f9",
  coral: "#f97316",
  natural: "#f5f0e8",
  dorado: "#d4a017",
  ladrillo: "#b22222",
  lavanda: "#b57edc",
  lila: "#c8a2c8",
  orquidea: "#da70d6",
  barniz: "#e8d0a0",
  // Metálicos/especiales
  "poliester-plata": "#c0c0c0",
  "poliester-oro": "#d4a017",
  "cepillado-plata": "#a8a8a8",
  "cepillado-oro": "#b8860b",
};

/**
 * Resolve a color value to CSS background.
 * Supports single colors ("negro") and mixed ("rosa-con-blanco", "blancoconnegro").
 * Returns { background, isMixed } or null if not a recognized color.
 */
function resolveColor(value: string): { background: string; isMixed: boolean } | null {
  const lower = value.toLowerCase().trim();

  // Direct match
  if (COLOR_MAP[lower]) {
    return { background: COLOR_MAP[lower], isMixed: false };
  }

  // Mixed colors: "rosa-con-blanco", "blancoconnegro", "verde-agua-con-negro"
  // Split by "con", "-con-", or camelCase "Con"
  const parts = lower
    .replace(/-con-/g, "|")
    .replace(/con(?=[a-z])/g, "|")
    .replace(/(?<=[a-z])con$/g, "|")
    .split("|")
    .map((p) => p.replace(/-/g, "").trim())
    .filter(Boolean);

  if (parts.length === 2) {
    // Try to match each part
    const findColor = (part: string): string | null => {
      if (COLOR_MAP[part]) return COLOR_MAP[part];
      // Try with hyphens
      for (const [key, hex] of Object.entries(COLOR_MAP)) {
        if (key.replace(/-/g, "") === part) return hex;
      }
      return null;
    };

    const c1 = findColor(parts[0]);
    const c2 = findColor(parts[1]);
    if (c1 && c2) {
      return { background: `linear-gradient(to right, ${c1} 50%, ${c2} 50%)`, isMixed: true };
    }
  }

  return null;
}

function slugToLabel(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isColorAttribute(values: string[]): boolean {
  const matched = values.filter((v) => resolveColor(v) !== null).length;
  return matched > values.length * 0.4;
}

/**
 * Extract real variation attributes from the variations array.
 * This is more reliable than the product's attributes which may have IDs instead of names.
 */
function extractAttributes(variations: ProductVariation[]) {
  const attrMap: Record<string, Set<string>> = {};

  for (const v of variations) {
    for (const [key, value] of Object.entries(v.attributes)) {
      if (!value) continue; // "any" value
      if (!attrMap[key]) attrMap[key] = new Set();
      attrMap[key].add(value);
    }
  }

  return Object.entries(attrMap)
    .filter(([, values]) => values.size > 1) // Skip attributes with only 1 option (auto-select)
    .map(([key, values]) => {
      const valArray = Array.from(values);
      // Clean up the attribute key for display
      const cleanName = key
        .replace(/^attribute_pa_/, "")
        .replace(/^attribute_/, "")
        .replace(/^\d+-/, "") // Remove leading numbers like "43-"
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/maximasuperficiededigital/i, "Color")
        .replace(/anchomaximodecorte/i, "Tamaño")
        .replace(/Condition/i, "Opcion");

      return {
        key,
        name: cleanName,
        values: valArray,
        isColor: isColorAttribute(valArray),
      };
    });
}

export function VariationSelector({ variations, onSelect }: Props) {
  const attributes = useMemo(() => extractAttributes(variations), [variations]);

  // Auto-select single-value attributes
  const autoSelected = useMemo(() => {
    const auto: Record<string, string> = {};
    for (const v of variations) {
      for (const [key, value] of Object.entries(v.attributes)) {
        if (!value) continue;
        // Check if ALL variations have the same value for this key
        const allSame = variations.every((vv) => !vv.attributes[key] || vv.attributes[key] === value);
        if (allSame) auto[key] = value;
      }
    }
    return auto;
  }, [variations]);

  const [selected, setSelected] = useState<Record<string, string>>(autoSelected);

  function handleSelect(attrKey: string, value: string) {
    const next = { ...selected, [attrKey]: selected[attrKey] === value ? "" : value };
    setSelected(next);

    // Find matching variation
    const match = variations.find((v) =>
      Object.entries(v.attributes).every(([k, val]) => {
        if (!val) return true; // "any" matches
        return !next[k] || next[k] === val;
      })
    );
    onSelect(match || null);
  }

  if (attributes.length === 0) {
    // All attributes are single-value, auto-select first variation
    if (variations.length === 1) {
      onSelect(variations[0]);
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {attributes.map((attr) => (
        <div key={attr.key}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {attr.name}
            {selected[attr.key] && (
              <span className="ml-2 font-normal text-gray-500">: {slugToLabel(selected[attr.key])}</span>
            )}
          </label>

          {attr.isColor ? (
            /* Color swatches */
            <div className="flex flex-wrap gap-2">
              {attr.values.map((value) => {
                const isSelected = selected[attr.key] === value;
                const hex = COLOR_MAP[value.toLowerCase()];
                const isAvailable = variations.some((v) =>
                  v.attributes[attr.key] === value && v.stock_status !== "outofstock"
                );

                const colorInfo = resolveColor(value);
                const hasWhite = value.toLowerCase().includes("blanco") || value.toLowerCase().includes("white");

                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(attr.key, value)}
                    disabled={!isAvailable}
                    title={slugToLabel(value)}
                    className={`relative w-10 h-10 rounded-full border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#013d5a] ring-2 ring-[#013d5a]/20 scale-110"
                        : isAvailable
                        ? "border-gray-200 hover:border-gray-400 hover:scale-105"
                        : "border-gray-100 opacity-30 cursor-not-allowed"
                    }`}
                  >
                    <span
                      className="absolute inset-1 rounded-full"
                      style={{ background: colorInfo?.background || "#ccc" }}
                    />
                    {hasWhite && !colorInfo?.isMixed ? (
                      <span className="absolute inset-1 rounded-full border border-gray-200" />
                    ) : null}
                    {!isAvailable && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-full h-0.5 bg-red-400 rotate-45 absolute" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Regular buttons */
            <div className="flex flex-wrap gap-2">
              {attr.values.map((value) => {
                const isSelected = selected[attr.key] === value;
                const isAvailable = variations.some((v) =>
                  v.attributes[attr.key] === value && v.stock_status !== "outofstock"
                );

                return (
                  <button
                    key={value}
                    onClick={() => handleSelect(attr.key, value)}
                    disabled={!isAvailable}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#013d5a] bg-[#013d5a] text-white shadow-sm"
                        : isAvailable
                        ? "border-gray-200 bg-white text-gray-700 hover:border-[#013d5a] hover:text-[#013d5a]"
                        : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                    }`}
                  >
                    {slugToLabel(value)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Show price if different variations have different prices */}
      {(() => {
        const prices = new Set(variations.map((v) => v.price));
        if (prices.size > 1) {
          const min = Math.min(...Array.from(prices).map(Number));
          const max = Math.max(...Array.from(prices).map(Number));
          const selectedVar = variations.find((v) =>
            Object.entries(v.attributes).every(([k, val]) => !val || !selected[k] || selected[k] === val)
          );
          if (!selectedVar) {
            return (
              <p className="text-xs text-gray-400">
                Desde {formatPrice(min)} hasta {formatPrice(max)}
              </p>
            );
          }
        }
        return null;
      })()}
    </div>
  );
}
