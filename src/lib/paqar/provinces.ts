/**
 * Mapeo de provincias argentinas al código ISO 3166-2 de 1 letra
 * que usa Correo Argentino en el campo `state` del API PAQ.AR.
 *
 * Tabla oficial en el manual (apiPaqAr-v2.md).
 */

import type { ProvinceCode } from "./types";

export interface Province {
  code: ProvinceCode;
  name: string;
  zone: "caba" | "gba" | "interior";
}

export const PROVINCES: Province[] = [
  { code: "C", name: "CABA", zone: "caba" },
  { code: "B", name: "Buenos Aires", zone: "gba" },
  { code: "K", name: "Catamarca", zone: "interior" },
  { code: "H", name: "Chaco", zone: "interior" },
  { code: "U", name: "Chubut", zone: "interior" },
  { code: "X", name: "Córdoba", zone: "interior" },
  { code: "W", name: "Corrientes", zone: "interior" },
  { code: "E", name: "Entre Ríos", zone: "interior" },
  { code: "P", name: "Formosa", zone: "interior" },
  { code: "Y", name: "Jujuy", zone: "interior" },
  { code: "L", name: "La Pampa", zone: "interior" },
  { code: "F", name: "La Rioja", zone: "interior" },
  { code: "M", name: "Mendoza", zone: "interior" },
  { code: "N", name: "Misiones", zone: "interior" },
  { code: "Q", name: "Neuquén", zone: "interior" },
  { code: "R", name: "Río Negro", zone: "interior" },
  { code: "A", name: "Salta", zone: "interior" },
  { code: "J", name: "San Juan", zone: "interior" },
  { code: "D", name: "San Luis", zone: "interior" },
  { code: "Z", name: "Santa Cruz", zone: "interior" },
  { code: "S", name: "Santa Fe", zone: "interior" },
  { code: "G", name: "Santiago del Estero", zone: "interior" },
  { code: "V", name: "Tierra del Fuego", zone: "interior" },
  { code: "T", name: "Tucumán", zone: "interior" },
];

const BY_CODE = new Map<string, Province>(
  PROVINCES.map((p) => [p.code, p])
);

const NORMALIZE = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const ALIASES: Record<string, ProvinceCode> = {
  "capital federal": "C",
  "ciudad autonoma de buenos aires": "C",
  "ciudad de buenos aires": "C",
  caba: "C",
  "buenos aires": "B",
  "provincia de buenos aires": "B",
  "gran buenos aires": "B",
  gba: "B",
};

/**
 * Convierte un nombre de provincia (en cualquier formato común) al código ISO.
 * Devuelve null si no matchea.
 */
export function provinceNameToCode(name: string): ProvinceCode | null {
  if (!name) return null;
  const normalized = NORMALIZE(name);

  if (normalized.length === 1) {
    const up = normalized.toUpperCase() as ProvinceCode;
    if (BY_CODE.has(up)) return up;
  }

  if (ALIASES[normalized]) return ALIASES[normalized];

  for (const p of PROVINCES) {
    if (NORMALIZE(p.name) === normalized) return p.code;
  }

  return null;
}

/** Dado un código ISO, devuelve nombre legible. */
export function provinceCodeToName(code: string): string | null {
  return BY_CODE.get(code.toUpperCase())?.name ?? null;
}

export function isValidProvinceCode(code: string): code is ProvinceCode {
  return BY_CODE.has(code.toUpperCase());
}
