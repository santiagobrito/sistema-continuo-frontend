/**
 * Grilla de tarifas PAQ.AR — acuerdo 20105 (Responsable Inscripto).
 *
 * Fuente: clientes/sistema-continuo/data/correo-argentino/tarifario-paqar-2026-06-01.pdf
 * Vigencia declarada: 01-junio-2026 (sujeta a cambio sin aviso por parte de CA).
 * **Precios finales SIN IVA** — hay que sumar 21% al mostrar al cliente.
 *
 * ⚠ CA ajusta tarifas cada 2-3 meses y avisa por email (no-reply@finanzascorreoarg)
 * a administracion@sistemacontinuo.com.ar. Incidente junio 2026: el aviso no se vio,
 * la web cotizó un mes con tarifario viejo y la factura de CA vino $554k arriba de
 * lo cobrado a clientes. Al actualizar esta grilla: bump RATES_GRID_VERSION.
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

export const RATES_GRID_VERSION = "2026-06-01";

// ── CLASICO ───────────────────────────────────────────────────────────────
const CLASICO_HOME: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 6409.09 }, { maxKg: 1, price: 6649.59 },
    { maxKg: 2, price: 7296.69 }, { maxKg: 3, price: 7516.53 },
    { maxKg: 5, price: 9933.88 }, { maxKg: 10, price: 12361.16 },
    { maxKg: 15, price: 16146.28 }, { maxKg: 20, price: 17176.86 },
    { maxKg: 25, price: 19877.69 }, { maxKg: 30, price: 20847.93 },
    { maxKg: 35, price: 25841.32 }, { maxKg: 40, price: 26614.05 },
    { maxKg: 50, price: 29414.88 },
  ],
  2: [
    { maxKg: 0.5, price: 7400.83 }, { maxKg: 1, price: 7973.55 },
    { maxKg: 2, price: 8209.09 }, { maxKg: 3, price: 8668.60 },
    { maxKg: 5, price: 13187.60 }, { maxKg: 10, price: 17638.02 },
    { maxKg: 15, price: 27329.75 }, { maxKg: 20, price: 32874.38 },
    { maxKg: 25, price: 38423.14 }, { maxKg: 30, price: 43971.07 },
    { maxKg: 35, price: 54088.43 }, { maxKg: 40, price: 59424.79 },
    { maxKg: 50, price: 70108.26 },
  ],
  3: [
    { maxKg: 0.5, price: 8057.85 }, { maxKg: 1, price: 8685.12 },
    { maxKg: 2, price: 8970.25 }, { maxKg: 3, price: 9777.69 },
    { maxKg: 5, price: 14776.86 }, { maxKg: 10, price: 21010.74 },
    { maxKg: 15, price: 33118.18 }, { maxKg: 20, price: 40595.04 },
    { maxKg: 25, price: 48073.55 }, { maxKg: 30, price: 55549.59 },
    { maxKg: 35, price: 67598.35 }, { maxKg: 40, price: 74866.12 },
    { maxKg: 50, price: 89410.74 },
  ],
  4: [
    { maxKg: 0.5, price: 8105.79 }, { maxKg: 1, price: 8748.76 },
    { maxKg: 2, price: 9485.12 }, { maxKg: 3, price: 10431.40 },
    { maxKg: 5, price: 16300.83 }, { maxKg: 10, price: 25262.81 },
    { maxKg: 15, price: 39878.51 }, { maxKg: 20, price: 49614.05 },
    { maxKg: 25, price: 59342.15 }, { maxKg: 30, price: 69076.86 },
    { maxKg: 35, price: 83372.73 }, { maxKg: 40, price: 92900.83 },
    { maxKg: 50, price: 111947.93 },
  ],
};

const CLASICO_AGENCY: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 4168.60 }, { maxKg: 1, price: 4232.23 },
    { maxKg: 2, price: 4534.71 }, { maxKg: 3, price: 4671.90 },
    { maxKg: 5, price: 6175.21 }, { maxKg: 10, price: 8959.50 },
    { maxKg: 15, price: 13480.17 }, { maxKg: 20, price: 15297.52 },
    { maxKg: 25, price: 17116.53 }, { maxKg: 30, price: 18935.54 },
    { maxKg: 35, price: 21921.49 }, { maxKg: 40, price: 23547.11 },
    { maxKg: 50, price: 26800.00 },
  ],
  2: [
    { maxKg: 0.5, price: 5052.07 }, { maxKg: 1, price: 5254.55 },
    { maxKg: 2, price: 6180.99 }, { maxKg: 3, price: 6836.36 },
    { maxKg: 5, price: 10954.55 }, { maxKg: 10, price: 16756.20 },
    { maxKg: 15, price: 25962.81 }, { maxKg: 20, price: 31230.58 },
    { maxKg: 25, price: 36732.23 }, { maxKg: 30, price: 42331.40 },
    { maxKg: 35, price: 51383.47 }, { maxKg: 40, price: 56453.72 },
    { maxKg: 50, price: 66602.48 },
  ],
  3: [
    { maxKg: 0.5, price: 5549.59 }, { maxKg: 1, price: 5780.99 },
    { maxKg: 2, price: 6734.71 }, { maxKg: 3, price: 7754.55 },
    { maxKg: 5, price: 13197.52 }, { maxKg: 10, price: 19960.33 },
    { maxKg: 15, price: 31462.81 }, { maxKg: 20, price: 38852.89 },
    { maxKg: 25, price: 46382.64 }, { maxKg: 30, price: 53914.05 },
    { maxKg: 35, price: 64218.18 }, { maxKg: 40, price: 71122.31 },
    { maxKg: 50, price: 84939.67 },
  ],
  4: [
    { maxKg: 0.5, price: 5736.36 }, { maxKg: 1, price: 6038.84 },
    { maxKg: 2, price: 7261.16 }, { maxKg: 3, price: 8790.08 },
    { maxKg: 5, price: 15485.95 }, { maxKg: 10, price: 24000.00 },
    { maxKg: 15, price: 38086.78 }, { maxKg: 20, price: 47870.25 },
    { maxKg: 25, price: 57653.72 }, { maxKg: 30, price: 67439.67 },
    { maxKg: 35, price: 79204.13 }, { maxKg: 40, price: 88255.37 },
    { maxKg: 50, price: 107085.12 },
  ],
};

// ── EXPRESO ───────────────────────────────────────────────────────────────
const EXPRESO_HOME: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 7051.24 }, { maxKg: 1, price: 7316.53 },
    { maxKg: 2, price: 8027.27 }, { maxKg: 3, price: 8268.60 },
    { maxKg: 5, price: 10924.79 }, { maxKg: 10, price: 13597.52 },
    { maxKg: 15, price: 19375.21 }, { maxKg: 20, price: 20607.44 },
    { maxKg: 25, price: 21866.94 }, { maxKg: 30, price: 25015.70 },
    { maxKg: 35, price: 31006.61 }, { maxKg: 40, price: 31939.67 },
    { maxKg: 50, price: 32898.35 },
  ],
  2: [
    { maxKg: 0.5, price: 10176.86 }, { maxKg: 1, price: 10961.16 },
    { maxKg: 2, price: 11288.43 }, { maxKg: 3, price: 11923.14 },
    { maxKg: 5, price: 18133.06 }, { maxKg: 10, price: 25870.25 },
    { maxKg: 15, price: 38467.77 }, { maxKg: 20, price: 47431.40 },
    { maxKg: 25, price: 56453.72 }, { maxKg: 30, price: 68626.45 },
    { maxKg: 35, price: 79137.19 }, { maxKg: 40, price: 88720.66 },
    { maxKg: 50, price: 106342.15 },
  ],
  3: [
    { maxKg: 0.5, price: 14769.42 }, { maxKg: 1, price: 15919.01 },
    { maxKg: 2, price: 16442.98 }, { maxKg: 3, price: 17924.79 },
    { maxKg: 5, price: 31220.66 }, { maxKg: 10, price: 57034.71 },
    { maxKg: 15, price: 89182.64 }, { maxKg: 20, price: 115128.93 },
    { maxKg: 25, price: 141071.07 }, { maxKg: 30, price: 167018.18 },
    { maxKg: 35, price: 242613.22 }, { maxKg: 40, price: 275553.72 },
    { maxKg: 50, price: 339884.30 },
  ],
  4: [
    { maxKg: 0.5, price: 18580.99 }, { maxKg: 1, price: 20057.02 },
    { maxKg: 2, price: 21733.88 }, { maxKg: 3, price: 23905.79 },
    { maxKg: 5, price: 37357.85 }, { maxKg: 10, price: 88589.26 },
    { maxKg: 15, price: 130811.57 }, { maxKg: 20, price: 166525.62 },
    { maxKg: 25, price: 201307.44 }, { maxKg: 30, price: 237195.04 },
    { maxKg: 35, price: 271786.78 }, { maxKg: 40, price: 308886.78 },
    { maxKg: 50, price: 381553.72 },
  ],
};

const EXPRESO_AGENCY: ZoneRates = {
  1: [
    { maxKg: 0.5, price: 4585.95 }, { maxKg: 1, price: 4653.72 },
    { maxKg: 2, price: 4990.08 }, { maxKg: 3, price: 5138.84 },
    { maxKg: 5, price: 6789.26 }, { maxKg: 10, price: 9856.20 },
    { maxKg: 15, price: 15070.25 }, { maxKg: 20, price: 16824.79 },
    { maxKg: 25, price: 18826.45 }, { maxKg: 30, price: 20861.16 },
    { maxKg: 35, price: 24114.88 }, { maxKg: 40, price: 25901.65 },
    { maxKg: 50, price: 29479.34 },
  ],
  2: [
    { maxKg: 0.5, price: 6950.41 }, { maxKg: 1, price: 7228.10 },
    { maxKg: 2, price: 8498.35 }, { maxKg: 3, price: 9400.00 },
    { maxKg: 5, price: 15068.60 }, { maxKg: 10, price: 24576.86 },
    { maxKg: 15, price: 36543.80 }, { maxKg: 20, price: 45059.50 },
    { maxKg: 25, price: 54031.40 }, { maxKg: 30, price: 65195.04 },
    { maxKg: 35, price: 75180.17 }, { maxKg: 40, price: 84284.30 },
    { maxKg: 50, price: 101025.62 },
  ],
  3: [
    { maxKg: 0.5, price: 10173.55 }, { maxKg: 1, price: 10595.87 },
    { maxKg: 2, price: 12343.80 }, { maxKg: 3, price: 16601.65 },
    { maxKg: 5, price: 29659.50 }, { maxKg: 10, price: 54183.47 },
    { maxKg: 15, price: 86647.93 }, { maxKg: 20, price: 112643.80 },
    { maxKg: 25, price: 138642.98 }, { maxKg: 30, price: 164642.15 },
    { maxKg: 35, price: 236621.49 }, { maxKg: 40, price: 269612.40 },
    { maxKg: 50, price: 334035.54 },
  ],
  4: [
    { maxKg: 0.5, price: 13142.15 }, { maxKg: 1, price: 13838.84 },
    { maxKg: 2, price: 16642.98 }, { maxKg: 3, price: 19456.20 },
    { maxKg: 5, price: 34112.40 }, { maxKg: 10, price: 81325.62 },
    { maxKg: 15, price: 122370.25 }, { maxKg: 20, price: 155421.49 },
    { maxKg: 25, price: 188480.17 }, { maxKg: 30, price: 225334.71 },
    { maxKg: 35, price: 265784.30 }, { maxKg: 40, price: 302942.15 },
    { maxKg: 50, price: 375702.48 },
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
