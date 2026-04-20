/**
 * Grilla de tarifas PAQ.AR — acuerdo 20105 (Responsable Inscripto).
 *
 * Fuente: clientes/sistema-continuo/tarifario-paqar.pdf
 * Vigencia declarada: 01-abril-2026 (sujeta a cambio sin aviso por parte de CA).
 * **Precios finales SIN IVA** — hay que sumar 21% al mostrar al cliente.
 *
 * Servicios:
 * - CLASICO: entrega estándar. Más barato. Default hoy (PAQAR_TIER=cheap).
 * - EXPRESO: entrega prioritaria. Más caro pero más rápido (PAQAR_TIER=premium).
 * - HOY: solo AMBA, mismo día (Zonas 5-6-7). NO implementado todavía.
 * - AFORADO: para cargas 60-250kg. NO relevante hoy (acuerdo tope 30kg).
 *
 * Cada entry es el precio para peso HASTA `maxKg` (bracket inclusive).
 * Para buscar: primer bracket cuyo maxKg >= peso_en_kg.
 */

export type PaqarRatesService = "clasico" | "expreso";
export type PaqarRatesMode = "homeDelivery" | "agency";
export type PaqarRatesZone = 1 | 2 | 3 | 4;

export interface WeightBracket {
  maxKg: number;
  price: number; // ARS sin IVA
}

type ZoneRates = Record<PaqarRatesZone, WeightBracket[]>;

export const RATES_GRID_VERSION = "2026-04-01";

// ── CLASICO ───────────────────────────────────────────────────────────────
const CLASICO_HOME: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 6046.28 }, { maxKg: 1, price: 6273.55 },
    { maxKg: 2, price: 6883.47 }, { maxKg: 3, price: 7090.91 },
    { maxKg: 5, price: 9371.90 }, { maxKg: 10, price: 11661.16 },
    { maxKg: 15, price: 15232.23 }, { maxKg: 20, price: 16204.96 },
    { maxKg: 25, price: 18752.89 }, { maxKg: 30, price: 19667.77 },
    { maxKg: 35, price: 24378.51 }, { maxKg: 40, price: 25107.44 },
    { maxKg: 50, price: 27749.59 },
  ],
  2: [
    { maxKg: 0.5, price: 6981.82 }, { maxKg: 1, price: 7522.31 },
    { maxKg: 2, price: 7744.63 }, { maxKg: 3, price: 8177.69 },
    { maxKg: 5, price: 12441.32 }, { maxKg: 10, price: 16639.67 },
    { maxKg: 15, price: 25782.64 }, { maxKg: 20, price: 31013.22 },
    { maxKg: 25, price: 36247.93 }, { maxKg: 30, price: 41481.82 },
    { maxKg: 35, price: 51026.45 }, { maxKg: 40, price: 56061.16 },
    { maxKg: 50, price: 66139.67 },
  ],
  3: [
    { maxKg: 0.5, price: 7601.65 }, { maxKg: 1, price: 8193.39 },
    { maxKg: 2, price: 8462.81 }, { maxKg: 3, price: 9223.97 },
    { maxKg: 5, price: 13940.50 }, { maxKg: 10, price: 19821.49 },
    { maxKg: 15, price: 31243.80 }, { maxKg: 20, price: 38297.52 },
    { maxKg: 25, price: 45352.07 }, { maxKg: 30, price: 52404.96 },
    { maxKg: 35, price: 63771.90 }, { maxKg: 40, price: 70628.10 },
    { maxKg: 50, price: 84349.59 },
  ],
  4: [
    { maxKg: 0.5, price: 7647.11 }, { maxKg: 1, price: 8253.72 },
    { maxKg: 2, price: 8947.93 }, { maxKg: 3, price: 9841.32 },
    { maxKg: 5, price: 15378.51 }, { maxKg: 10, price: 23833.06 },
    { maxKg: 15, price: 37621.49 }, { maxKg: 20, price: 46805.79 },
    { maxKg: 25, price: 55983.47 }, { maxKg: 30, price: 65166.94 },
    { maxKg: 35, price: 78653.72 }, { maxKg: 40, price: 87642.15 },
    { maxKg: 50, price: 105611.57 },
  ],
};

const CLASICO_AGENCY: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 3593.39 }, { maxKg: 1, price: 3648.76 },
    { maxKg: 2, price: 3909.09 }, { maxKg: 3, price: 4027.27 },
    { maxKg: 5, price: 5323.14 }, { maxKg: 10, price: 7723.97 },
    { maxKg: 15, price: 11620.66 }, { maxKg: 20, price: 13187.60 },
    { maxKg: 25, price: 14755.37 }, { maxKg: 30, price: 16323.97 },
    { maxKg: 35, price: 18897.52 }, { maxKg: 40, price: 20299.17 },
    { maxKg: 50, price: 23103.31 },
  ],
  2: [
    { maxKg: 0.5, price: 4355.37 }, { maxKg: 1, price: 4529.75 },
    { maxKg: 2, price: 5328.10 }, { maxKg: 3, price: 5893.39 },
    { maxKg: 5, price: 9443.80 }, { maxKg: 10, price: 14674.38 },
    { maxKg: 15, price: 24084.30 }, { maxKg: 20, price: 29370.25 },
    { maxKg: 25, price: 34652.89 }, { maxKg: 30, price: 39935.54 },
    { maxKg: 35, price: 46299.17 }, { maxKg: 40, price: 51380.99 },
    { maxKg: 50, price: 61547.93 },
  ],
  3: [
    { maxKg: 0.5, price: 4784.30 }, { maxKg: 1, price: 4983.47 },
    { maxKg: 2, price: 5805.79 }, { maxKg: 3, price: 6685.12 },
    { maxKg: 5, price: 11376.86 }, { maxKg: 10, price: 18110.74 },
    { maxKg: 15, price: 29548.76 }, { maxKg: 20, price: 36653.72 },
    { maxKg: 25, price: 43757.02 }, { maxKg: 30, price: 50861.98 },
    { maxKg: 35, price: 59047.93 }, { maxKg: 40, price: 65950.41 },
    { maxKg: 50, price: 79754.55 },
  ],
  4: [
    { maxKg: 0.5, price: 4945.45 }, { maxKg: 1, price: 5205.79 },
    { maxKg: 2, price: 6259.50 }, { maxKg: 3, price: 7577.69 },
    { maxKg: 5, price: 13513.22 }, { maxKg: 10, price: 22120.66 },
    { maxKg: 15, price: 35930.58 }, { maxKg: 20, price: 45160.33 },
    { maxKg: 25, price: 54390.08 }, { maxKg: 30, price: 63622.31 },
    { maxKg: 35, price: 73928.93 }, { maxKg: 40, price: 82961.16 },
    { maxKg: 50, price: 101023.97 },
  ],
};

// ── EXPRESO ───────────────────────────────────────────────────────────────
const EXPRESO_HOME: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 6652.07 }, { maxKg: 1, price: 6902.48 },
    { maxKg: 2, price: 7572.73 }, { maxKg: 3, price: 7800.83 },
    { maxKg: 5, price: 10306.61 }, { maxKg: 10, price: 12828.10 },
    { maxKg: 15, price: 18278.51 }, { maxKg: 20, price: 19441.32 },
    { maxKg: 25, price: 20628.93 }, { maxKg: 30, price: 23600.00 },
    { maxKg: 35, price: 29251.24 }, { maxKg: 40, price: 30131.40 },
    { maxKg: 50, price: 31036.36 },
  ],
  2: [
    { maxKg: 0.5, price: 9600.83 }, { maxKg: 1, price: 10340.50 },
    { maxKg: 2, price: 10649.59 }, { maxKg: 3, price: 11247.93 },
    { maxKg: 5, price: 17106.61 }, { maxKg: 10, price: 24405.79 },
    { maxKg: 15, price: 36290.08 }, { maxKg: 20, price: 44746.28 },
    { maxKg: 25, price: 53257.85 }, { maxKg: 30, price: 64742.15 },
    { maxKg: 35, price: 74657.85 }, { maxKg: 40, price: 83698.35 },
    { maxKg: 50, price: 100323.14 },
  ],
  3: [
    { maxKg: 0.5, price: 13933.06 }, { maxKg: 1, price: 15018.18 },
    { maxKg: 2, price: 15512.40 }, { maxKg: 3, price: 16909.92 },
    { maxKg: 5, price: 29453.72 }, { maxKg: 10, price: 53806.61 },
    { maxKg: 15, price: 84134.71 }, { maxKg: 20, price: 108612.40 },
    { maxKg: 25, price: 133085.95 }, { maxKg: 30, price: 157564.46 },
    { maxKg: 35, price: 228880.17 }, { maxKg: 40, price: 259956.20 },
    { maxKg: 50, price: 320645.45 },
  ],
  4: [
    { maxKg: 0.5, price: 17528.93 }, { maxKg: 1, price: 18921.49 },
    { maxKg: 2, price: 20503.31 }, { maxKg: 3, price: 22552.89 },
    { maxKg: 5, price: 35242.98 }, { maxKg: 10, price: 83574.38 },
    { maxKg: 15, price: 123407.44 }, { maxKg: 20, price: 157100.00 },
    { maxKg: 25, price: 189912.40 }, { maxKg: 30, price: 223768.60 },
    { maxKg: 35, price: 256402.48 }, { maxKg: 40, price: 291402.48 },
    { maxKg: 50, price: 359956.20 },
  ],
};

const EXPRESO_AGENCY: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 3953.72 }, { maxKg: 1, price: 4011.57 },
    { maxKg: 2, price: 4301.65 }, { maxKg: 3, price: 4429.75 },
    { maxKg: 5, price: 5852.89 }, { maxKg: 10, price: 8496.69 },
    { maxKg: 15, price: 12991.74 }, { maxKg: 20, price: 14504.13 },
    { maxKg: 25, price: 16229.75 }, { maxKg: 30, price: 17983.47 },
    { maxKg: 35, price: 20788.43 }, { maxKg: 40, price: 22328.93 },
    { maxKg: 50, price: 25413.22 },
  ],
  2: [
    { maxKg: 0.5, price: 5991.74 }, { maxKg: 1, price: 6231.40 },
    { maxKg: 2, price: 7326.45 }, { maxKg: 3, price: 8103.31 },
    { maxKg: 5, price: 12990.08 }, { maxKg: 10, price: 21237.19 },
    { maxKg: 15, price: 33845.45 }, { maxKg: 20, price: 42412.40 },
    { maxKg: 25, price: 50972.73 }, { maxKg: 30, price: 59529.75 },
    { maxKg: 35, price: 68995.87 }, { maxKg: 40, price: 78085.95 },
    { maxKg: 50, price: 94806.61 },
  ],
  3: [
    { maxKg: 0.5, price: 8770.25 }, { maxKg: 1, price: 9134.71 },
    { maxKg: 2, price: 10641.32 }, { maxKg: 3, price: 14311.57 },
    { maxKg: 5, price: 26584.30 }, { maxKg: 10, price: 50916.53 },
    { maxKg: 15, price: 81742.98 }, { maxKg: 20, price: 106267.77 },
    { maxKg: 25, price: 130795.04 }, { maxKg: 30, price: 155323.14 },
    { maxKg: 35, price: 223228.10 }, { maxKg: 40, price: 254351.24 },
    { maxKg: 50, price: 315128.10 },
  ],
  4: [
    { maxKg: 0.5, price: 11329.75 }, { maxKg: 1, price: 11929.75 },
    { maxKg: 2, price: 14347.11 }, { maxKg: 3, price: 16772.73 },
    { maxKg: 5, price: 34052.89 }, { maxKg: 10, price: 70108.26 },
    { maxKg: 15, price: 105491.74 }, { maxKg: 20, price: 133984.30 },
    { maxKg: 25, price: 162482.64 }, { maxKg: 30, price: 200067.77 },
    { maxKg: 35, price: 250739.67 }, { maxKg: 40, price: 285794.21 },
    { maxKg: 50, price: 354436.36 },
  ],
};

export const RATES_GRID: Record<PaqarRatesService, Record<PaqarRatesMode, ZoneRates>> = {
  clasico: { homeDelivery: CLASICO_HOME, agency: CLASICO_AGENCY },
  expreso: { homeDelivery: EXPRESO_HOME, agency: EXPRESO_AGENCY },
};

/**
 * Busca el precio sin IVA para un peso dado.
 * Si el peso excede el bracket máximo (50kg), devuelve null.
 */
export function lookupPrice(
  service: PaqarRatesService,
  mode: PaqarRatesMode,
  zone: PaqarRatesZone,
  weightGrams: number
): number | null {
  const kg = weightGrams / 1000;
  const brackets = RATES_GRID[service][mode][zone];
  for (const b of brackets) {
    if (kg <= b.maxKg) return b.price;
  }
  return null;
}

/** IVA Argentina. Aplicar al precio sin IVA para obtener el precio final al consumidor. */
export const IVA_RATE = 0.21;

/** Peso volumétrico: dim(cm³) / coeficiente. Coef estándar CA = 6000 cm³/kg. */
export const VOLUMETRIC_COEFFICIENT = 6000;
