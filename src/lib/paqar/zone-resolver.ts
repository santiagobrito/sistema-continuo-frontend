/**
 * Resolver de zona (1-4) de facturación PAQ.AR para CLASICO + EXPRESO.
 *
 * Reglas del tarifario (PDF 2026-04-01):
 *
 * 1. Mismo CP origen y destino → Zona 1.
 * 2. AMBA ↔ AMBA → Zona 1. AMBA = CP 1000-1893 + extras (1924, 2752, 2760,
 *    2814, 2930, 2931, 2935, 2953).
 * 3. En cualquier otro caso → matriz provincia_origen × provincia_destino.
 *
 * Para Sistema Continuo el origen está fijo en 1706 Haedo (provincia B, AMBA).
 * Pero el resolver es genérico, soporta cualquier origen.
 *
 * NOTA: CABA (código ISO "C") no aparece en la matriz del PDF — se trata como
 * Buenos Aires ("B") a efectos de zonificación (la regla AMBA cubre el caso
 * habitual CABA↔CABA y CABA↔GBA; para CABA→interior se usa BA como origen).
 */

import type { ProvinceCode } from "./types";
import type { PaqarRatesZone } from "./rates-grid";

const AMBA_EXTRA_CPS = new Set(["1924", "2752", "2760", "2814", "2930", "2931", "2935", "2953"]);

function numericCp(cp: string): number {
  const digits = cp.replace(/\D/g, "").slice(0, 4);
  return digits ? parseInt(digits, 10) : NaN;
}

function isAmba(cp: string): boolean {
  const n = numericCp(cp);
  if (!isNaN(n) && n >= 1000 && n <= 1893) return true;
  const normalized = cp.replace(/\D/g, "").slice(0, 4);
  return AMBA_EXTRA_CPS.has(normalized);
}

/**
 * Jurisdicción real según el código postal, para no depender de que el cliente
 * elija bien la provincia en el desplegable.
 *
 * CABA son los CP 1000-1499. El resto de AMBA es provincia de Buenos Aires.
 * Para el interior devuelve null: ahí la provincia elegida es el único dato y
 * no hay nada que corregir.
 *
 * Lo usa el checkout para mostrar las opciones de envío que corresponden al CP
 * aunque la provincia elegida diga otra cosa. Reportado por Gabriel (equipo SC)
 * el 25-ago-2026: gente de Capital elegía "Buenos Aires" y se quedaba sin la
 * opción de moto CABA.
 */
export function cpJurisdiction(cp: string): "C" | "B" | null {
  const n = numericCp(cp);
  if (isNaN(n)) return null;
  if (n >= 1000 && n <= 1499) return "C";
  if (isAmba(cp)) return "B";
  return null;
}

function sameCp(originCp: string, destCp: string): boolean {
  const a = originCp.replace(/\D/g, "").slice(0, 4);
  const b = destCp.replace(/\D/g, "").slice(0, 4);
  return !!a && a === b;
}

/**
 * Matriz del PDF: ZONE_MATRIX[origen][destino] = zona.
 * CABA ("C") no existe en la matriz — se trata como Buenos Aires ("B").
 *
 * Códigos ISO 3166-2 AR de 1 letra:
 *   B Buenos Aires, K Catamarca, H Chaco, U Chubut, X Córdoba,
 *   W Corrientes, E Entre Ríos, P Formosa, Y Jujuy, L La Pampa,
 *   F La Rioja, M Mendoza, N Misiones, Q Neuquén, R Río Negro,
 *   A Salta, J San Juan, D San Luis, Z Santa Cruz, S Santa Fe,
 *   G Sgo. del Estero, V Tierra del Fuego, T Tucumán.
 */
const ZONE_MATRIX: Record<string, Record<string, PaqarRatesZone>> = {
  B: { B: 2, K: 3, H: 3, U: 4, X: 2, W: 3, E: 2, P: 3, Y: 4, L: 2, F: 3, M: 3, N: 3, Q: 3, R: 3, A: 4, J: 3, D: 3, Z: 4, S: 2, G: 3, V: 4, T: 3 },
  K: { B: 3, K: 2, H: 3, U: 4, X: 2, W: 3, E: 3, P: 3, Y: 2, L: 3, F: 2, M: 3, N: 3, Q: 4, R: 4, A: 2, J: 2, D: 2, Z: 4, S: 3, G: 2, V: 4, T: 2 },
  H: { B: 3, K: 3, H: 2, U: 4, X: 3, W: 2, E: 2, P: 2, Y: 3, L: 4, F: 3, M: 4, N: 2, Q: 4, R: 4, A: 3, J: 4, D: 4, Z: 4, S: 2, G: 2, V: 4, T: 3 },
  U: { B: 4, K: 4, H: 4, U: 2, X: 4, W: 4, E: 4, P: 4, Y: 4, L: 3, F: 4, M: 4, N: 4, Q: 3, R: 2, A: 4, J: 4, D: 4, Z: 3, S: 4, G: 4, V: 4, T: 4 },
  X: { B: 2, K: 2, H: 3, U: 4, X: 2, W: 3, E: 2, P: 3, Y: 3, L: 2, F: 2, M: 2, N: 4, Q: 3, R: 3, A: 3, J: 2, D: 2, Z: 4, S: 2, G: 2, V: 4, T: 2 },
  W: { B: 3, K: 3, H: 2, U: 4, X: 3, W: 2, E: 2, P: 2, Y: 3, L: 4, F: 3, M: 4, N: 2, Q: 4, R: 4, A: 3, J: 4, D: 4, Z: 4, S: 2, G: 2, V: 4, T: 3 },
  E: { B: 2, K: 3, H: 2, U: 4, X: 2, W: 2, E: 2, P: 3, Y: 3, L: 3, F: 3, M: 3, N: 3, Q: 4, R: 4, A: 3, J: 3, D: 2, Z: 4, S: 2, G: 2, V: 4, T: 3 },
  P: { B: 3, K: 3, H: 2, U: 4, X: 3, W: 2, E: 3, P: 2, Y: 3, L: 4, F: 3, M: 4, N: 2, Q: 4, R: 4, A: 3, J: 4, D: 4, Z: 4, S: 2, G: 3, V: 4, T: 3 },
  Y: { B: 4, K: 2, H: 3, U: 4, X: 3, W: 3, E: 3, P: 3, Y: 2, L: 4, F: 3, M: 4, N: 3, Q: 4, R: 4, A: 2, J: 4, D: 4, Z: 4, S: 3, G: 2, V: 4, T: 2 },
  L: { B: 2, K: 3, H: 4, U: 3, X: 2, W: 4, E: 3, P: 4, Y: 4, L: 2, F: 3, M: 3, N: 4, Q: 2, R: 2, A: 4, J: 3, D: 2, Z: 4, S: 3, G: 3, V: 4, T: 3 },
  F: { B: 3, K: 2, H: 3, U: 4, X: 2, W: 3, E: 3, P: 3, Y: 3, L: 3, F: 2, M: 2, N: 4, Q: 4, R: 4, A: 2, J: 2, D: 2, Z: 4, S: 3, G: 2, V: 4, T: 2 },
  M: { B: 3, K: 3, H: 4, U: 4, X: 2, W: 4, E: 3, P: 4, Y: 4, L: 3, F: 2, M: 2, N: 4, Q: 3, R: 4, A: 4, J: 2, D: 2, Z: 4, S: 3, G: 3, V: 4, T: 3 },
  N: { B: 3, K: 3, H: 2, U: 4, X: 4, W: 2, E: 3, P: 2, Y: 3, L: 4, F: 4, M: 4, N: 2, Q: 4, R: 4, A: 3, J: 4, D: 4, Z: 4, S: 3, G: 3, V: 4, T: 3 },
  Q: { B: 3, K: 4, H: 4, U: 3, X: 3, W: 4, E: 4, P: 4, Y: 4, L: 2, F: 4, M: 3, N: 4, Q: 2, R: 2, A: 4, J: 3, D: 3, Z: 4, S: 4, G: 4, V: 4, T: 4 },
  R: { B: 3, K: 4, H: 4, U: 2, X: 3, W: 4, E: 4, P: 4, Y: 4, L: 2, F: 4, M: 4, N: 4, Q: 2, R: 2, A: 4, J: 4, D: 3, Z: 4, S: 4, G: 4, V: 4, T: 4 },
  A: { B: 4, K: 2, H: 3, U: 4, X: 3, W: 3, E: 3, P: 3, Y: 2, L: 4, F: 2, M: 4, N: 3, Q: 4, R: 4, A: 2, J: 3, D: 4, Z: 4, S: 3, G: 2, V: 4, T: 2 },
  J: { B: 3, K: 2, H: 4, U: 4, X: 2, W: 4, E: 3, P: 4, Y: 4, L: 3, F: 2, M: 2, N: 4, Q: 3, R: 4, A: 3, J: 2, D: 2, Z: 4, S: 3, G: 3, V: 4, T: 3 },
  D: { B: 3, K: 2, H: 4, U: 4, X: 2, W: 4, E: 2, P: 4, Y: 4, L: 2, F: 2, M: 2, N: 4, Q: 3, R: 3, A: 4, J: 2, D: 2, Z: 4, S: 2, G: 3, V: 4, T: 3 },
  Z: { B: 4, K: 4, H: 4, U: 3, X: 4, W: 4, E: 4, P: 4, Y: 4, L: 4, F: 4, M: 4, N: 4, Q: 3, R: 3, A: 4, J: 4, D: 4, Z: 2, S: 4, G: 4, V: 2, T: 4 },
  S: { B: 2, K: 3, H: 2, U: 4, X: 2, W: 2, E: 2, P: 2, Y: 3, L: 3, F: 3, M: 3, N: 3, Q: 4, R: 4, A: 3, J: 3, D: 2, Z: 4, S: 2, G: 2, V: 4, T: 3 },
  G: { B: 3, K: 2, H: 2, U: 4, X: 2, W: 2, E: 2, P: 3, Y: 2, L: 3, F: 2, M: 3, N: 3, Q: 4, R: 4, A: 2, J: 3, D: 3, Z: 4, S: 2, G: 2, V: 4, T: 2 },
  V: { B: 4, K: 4, H: 4, U: 3, X: 4, W: 4, E: 4, P: 4, Y: 4, L: 4, F: 4, M: 4, N: 4, Q: 3, R: 3, A: 4, J: 4, D: 4, Z: 2, S: 4, G: 4, V: 2, T: 4 },
  T: { B: 3, K: 2, H: 3, U: 4, X: 2, W: 3, E: 3, P: 3, Y: 2, L: 3, F: 2, M: 3, N: 3, Q: 4, R: 4, A: 2, J: 3, D: 3, Z: 4, S: 3, G: 2, V: 4, T: 2 },
};

/**
 * CABA ("C") no aparece en la matriz — se trata como Buenos Aires ("B").
 * Esto cubre: CABA→interior, interior→CABA, y el matriz-lookup para AMBA↔no-AMBA.
 */
function normalizeForMatrix(code: ProvinceCode): string {
  return code === "C" ? "B" : code;
}

export interface ZoneResolverInput {
  originCp: string;
  originState: ProvinceCode;
  destCp: string;
  destState: ProvinceCode;
}

/**
 * Devuelve la zona 1-4 aplicable. Null si no se puede resolver (provincia
 * no reconocida, etc).
 */
export function resolveZone(input: ZoneResolverInput): PaqarRatesZone | null {
  if (sameCp(input.originCp, input.destCp)) return 1;

  // AMBA ↔ AMBA → Z1.
  if (isAmba(input.originCp) && isAmba(input.destCp)) return 1;

  const origin = normalizeForMatrix(input.originState);
  const dest = normalizeForMatrix(input.destState);

  const row = ZONE_MATRIX[origin];
  if (!row) return null;
  const zone = row[dest];
  return zone ?? null;
}
