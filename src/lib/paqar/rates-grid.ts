/**
 * Grilla de tarifas PAQ.AR — acuerdo 20105 (Responsable Inscripto).
 *
 * Fuente: clientes/sistema-continuo/data/correo-argentino/lista-precios-micorreo-2026-09-01.pdf
 * Vigencia declarada: 01-septiembre-2026 (sujeta a cambio sin aviso por parte de CA).
 *
 * Contra la lista de junio SOLO cambian las tablas A SUCURSAL (+2,4% a +6,0% en
 * clasico, +1,4% a +6,0% en expreso). Domicilio quedo IGUAL. Verificado de tres
 * formas el 2026-09-16: transcripcion visual contra pdftotext (0 discrepancias en
 * 208 celdas), diff programatico de las 10 tablas de cada PDF, y contra la factura
 * real de agosto (2980-00026532), cuyas 141 guias coinciden 141/141 con la lista de
 * junio y 0 con la de septiembre.
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

export const RATES_GRID_VERSION = "2026-09-01";

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
    { maxKg: 0.5, price: 4419.01 }, { maxKg: 1, price: 4485.95 },
    { maxKg: 2, price: 4806.61 }, { maxKg: 3, price: 4952.07 },
    { maxKg: 5, price: 6545.45 }, { maxKg: 10, price: 9496.69 },
    { maxKg: 15, price: 14289.26 }, { maxKg: 20, price: 16215.70 },
    { maxKg: 25, price: 18143.80 }, { maxKg: 30, price: 20071.90 },
    { maxKg: 35, price: 23237.19 }, { maxKg: 40, price: 24960.33 },
    { maxKg: 50, price: 28408.26 },
  ],
  2: [
    { maxKg: 0.5, price: 5355.37 }, { maxKg: 1, price: 5569.42 },
    { maxKg: 2, price: 6552.07 }, { maxKg: 3, price: 7246.28 },
    { maxKg: 5, price: 11611.57 }, { maxKg: 10, price: 17638.02 },
    { maxKg: 15, price: 27329.75 }, { maxKg: 20, price: 32874.38 },
    { maxKg: 25, price: 38423.14 }, { maxKg: 30, price: 43971.07 },
    { maxKg: 35, price: 54088.43 }, { maxKg: 40, price: 59424.79 },
    { maxKg: 50, price: 70108.26 },
  ],
  3: [
    { maxKg: 0.5, price: 5882.64 }, { maxKg: 1, price: 6128.10 },
    { maxKg: 2, price: 7138.84 }, { maxKg: 3, price: 8219.83 },
    { maxKg: 5, price: 13989.26 }, { maxKg: 10, price: 21010.74 },
    { maxKg: 15, price: 33118.18 }, { maxKg: 20, price: 40595.04 },
    { maxKg: 25, price: 48073.55 }, { maxKg: 30, price: 55549.59 },
    { maxKg: 35, price: 67598.35 }, { maxKg: 40, price: 74866.12 },
    { maxKg: 50, price: 89410.74 },
  ],
  4: [
    { maxKg: 0.5, price: 6080.17 }, { maxKg: 1, price: 6400.83 },
    { maxKg: 2, price: 7696.69 }, { maxKg: 3, price: 9317.36 },
    { maxKg: 5, price: 16300.83 }, { maxKg: 10, price: 25262.81 },
    { maxKg: 15, price: 39878.51 }, { maxKg: 20, price: 49614.05 },
    { maxKg: 25, price: 59342.15 }, { maxKg: 30, price: 69076.86 },
    { maxKg: 35, price: 83372.73 }, { maxKg: 40, price: 92900.83 },
    { maxKg: 50, price: 111947.93 },
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
    { maxKg: 0.5, price: 4861.16 }, { maxKg: 1, price: 4933.06 },
    { maxKg: 2, price: 5289.26 }, { maxKg: 3, price: 5447.11 },
    { maxKg: 5, price: 7196.69 }, { maxKg: 10, price: 10447.93 },
    { maxKg: 15, price: 15974.38 }, { maxKg: 20, price: 17833.88 },
    { maxKg: 25, price: 19956.20 }, { maxKg: 30, price: 22113.22 },
    { maxKg: 35, price: 25561.98 }, { maxKg: 40, price: 27455.37 },
    { maxKg: 50, price: 31247.93 },
  ],
  2: [
    { maxKg: 0.5, price: 7367.77 }, { maxKg: 1, price: 7661.98 },
    { maxKg: 2, price: 9008.26 }, { maxKg: 3, price: 9963.64 },
    { maxKg: 5, price: 15972.73 }, { maxKg: 10, price: 25870.25 },
    { maxKg: 15, price: 38467.77 }, { maxKg: 20, price: 47431.40 },
    { maxKg: 25, price: 56453.72 }, { maxKg: 30, price: 68626.45 },
    { maxKg: 35, price: 79137.19 }, { maxKg: 40, price: 88720.66 },
    { maxKg: 50, price: 106342.15 },
  ],
  3: [
    { maxKg: 0.5, price: 10784.30 }, { maxKg: 1, price: 11231.40 },
    { maxKg: 2, price: 13084.30 }, { maxKg: 3, price: 17597.52 },
    { maxKg: 5, price: 31220.66 }, { maxKg: 10, price: 57034.71 },
    { maxKg: 15, price: 89182.64 }, { maxKg: 20, price: 115128.93 },
    { maxKg: 25, price: 141071.07 }, { maxKg: 30, price: 167018.18 },
    { maxKg: 35, price: 242613.22 }, { maxKg: 40, price: 275553.72 },
    { maxKg: 50, price: 339884.30 },
  ],
  4: [
    { maxKg: 0.5, price: 13930.58 }, { maxKg: 1, price: 14669.42 },
    { maxKg: 2, price: 17641.32 }, { maxKg: 3, price: 20623.97 },
    { maxKg: 5, price: 36159.50 }, { maxKg: 10, price: 86204.96 },
    { maxKg: 15, price: 129712.40 }, { maxKg: 20, price: 164747.11 },
    { maxKg: 25, price: 199789.26 }, { maxKg: 30, price: 237195.04 },
    { maxKg: 35, price: 271786.78 }, { maxKg: 40, price: 308886.78 },
    { maxKg: 50, price: 381553.72 },
  ],
};

export const RATES_GRID: Record<PaqarRatesService, Record<PaqarRatesMode, ZoneRates>> = {
  clasico: { homeDelivery: CLASICO_HOME, agency: CLASICO_AGENCY },
  expreso: { homeDelivery: EXPRESO_HOME, agency: EXPRESO_AGENCY },
};

/**
 * Multiplicador sobre la tarifa de lista. En 1 = se cobra exactamente lo que
 * factura Correo Argentino, que es la política del cliente: el envío cubre
 * costo, no lleva margen.
 *
 * Historia: entre el 2026-09-01 y el 2026-09-16 valió 1,05, un recargo puesto a
 * pedido de Gustavo para anticipar un aumento de CA que todavía no se conocía.
 * Al publicarse la lista de septiembre resultó que CA **no** aumentó domicilio
 * (solo sucursal), así que ese 5% había dejado de ser una estimación para pasar
 * a ser markup: sobre las 141 guías reales de agosto eran $49.473/mes por encima
 * de lo que CA factura. Santi ordenó quitarlo el 2026-09-16.
 *
 * Si vuelve a hacer falta un recargo puente, va acá y NO tocando la grilla, que
 * es copia fiel del tarifario. Espejo obligatorio en el plugin WP:
 * `SC_Feeds::TEMP_RATE_SURCHARGE` (class-feeds.php) — los dos se cambian juntos
 * o Google anuncia un envío distinto al que se cobra.
 */
export const TEMP_RATE_SURCHARGE = 1;

/**
 * Busca el precio sin IVA para un peso dado (con TEMP_RATE_SURCHARGE aplicado).
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
    if (kg <= b.maxKg) return b.price * TEMP_RATE_SURCHARGE;
  }
  return null;
}

/** IVA Argentina. Aplicar al precio sin IVA para obtener el precio final al consumidor. */
export const IVA_RATE = 0.21;

/**
 * Peso volumétrico: dim(cm³) / coeficiente.
 *
 * **4000, medido contra la factura, no 6000.** El tarifario de CA describe la fórmula
 * ("comparar el peso volumétrico y el peso real, tomando el mayor de los dos") pero NO
 * publica el coeficiente, así que hasta agosto de 2026 acá había un 6000, que es el
 * estándar de courier internacional (IATA) y no el de Correo Argentino.
 *
 * El detalle por envío de la factura de julio 2026 (159 bultos) lo fija en 4000:
 * en 87 de 159 el peso aforado es exactamente alto*ancho*largo/4000 (redondeado a 3
 * decimales, que es como lo emite CA), y no hay ninguna fila donde el aforado quede por
 * debajo de ese piso. Con 6000 no coincide ninguna.
 * Costo del error: $195.512 netos en julio, el 76% de la diferencia del mes.
 *
 * ⚠ DISPUTADO (2026-08-11). Sabrina, de Correo Argentino, dice verbalmente que el
 * volumétrico es cm³/6000. La factura dice lo contrario, y las medidas del detalle son
 * las que declaramos nosotros por API (hay bultos de 1-2 cm de alto: CA no remide, copia
 * lo que le mandamos), así que el divisor no se explica por las cajas reales de SC.
 * Se mantiene 4000 porque es lo que CA efectivamente cobró sobre 159 guías: cotizar con
 * 6000 volvería a perder ~$195k/mes mientras dure la discusión.
 * Si CA confirma 6000 por escrito: volver a 6000 acá y reclamar nota de crédito por
 * $222.660 netos de julio (78 bultos subieron de escalón; el $150.663 que figuraba
 * antes era un piso, salía de un tarifario derivado de la propia factura y dejaba sin
 * precio de referencia a los bultos cuyo escalón alternativo no aparecía en el mes).
 * Consulta enviada en
 * data/correo-argentino/consulta-sabrina-coeficiente-aforo-2026-08-11.txt
 *
 * Ver reports/2026-08-11-detalle-envios-correo-julio.md
 */
export const VOLUMETRIC_COEFFICIENT = 4000;
