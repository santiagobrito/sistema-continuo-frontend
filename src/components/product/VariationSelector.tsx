"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils/format";
import type { ProductVariation, ProductAttribute } from "@/lib/wordpress/types";

interface Props {
  attributes: ProductAttribute[];
  variations: ProductVariation[];
  defaultAttributes?: Record<string, string>;
  onSelect: (variation: ProductVariation | null) => void;
}

export function VariationSelector({ attributes, variations, defaultAttributes, onSelect }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>(defaultAttributes || {});

  const variationAttributes = attributes.filter((a) => a.variation);

  function handleSelect(attrSlug: string, value: string) {
    const next = { ...selected, [attrSlug]: value };
    setSelected(next);

    // Find matching variation
    const match = variations.find((v) =>
      variationAttributes.every((attr) => {
        const key = `attribute_${attr.slug}`;
        const selectedVal = next[attr.slug];
        return !selectedVal || v.attributes[key] === selectedVal || v.attributes[key] === "";
      })
    );

    onSelect(match || null);
  }

  return (
    <div className="space-y-4">
      {variationAttributes.map((attr) => (
        <div key={attr.slug}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {attr.name}
            {selected[attr.slug] && (
              <span className="ml-2 font-normal text-gray-500">: {selected[attr.slug]}</span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {attr.options.map((option) => {
              const isSelected = selected[attr.slug] === option;
              const optionStr = typeof option === "object" ? (option as { name?: string }).name || String(option) : String(option);

              // Check if this option is available (has matching variation in stock)
              const isAvailable = variations.some((v) => {
                const key = `attribute_${attr.slug}`;
                return (v.attributes[key] === optionStr || v.attributes[key] === "") && v.stock_status !== "outofstock";
              });

              return (
                <button
                  key={optionStr}
                  onClick={() => handleSelect(attr.slug, optionStr)}
                  disabled={!isAvailable}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    isSelected
                      ? "border-[#013d5a] bg-[#013d5a] text-white shadow-sm"
                      : isAvailable
                      ? "border-gray-200 bg-white text-gray-700 hover:border-[#013d5a] hover:text-[#013d5a]"
                      : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                  }`}
                >
                  {optionStr}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
