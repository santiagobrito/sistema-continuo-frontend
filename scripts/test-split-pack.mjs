/**
 * Test del apilado en el split de bultos PAQ.AR (src/lib/paqar/split.ts).
 *
 * Corre la lógica real (vía jiti, sin build) y cotiza cada caso con la grilla
 * de tarifas, que es lo que ve el cliente en el checkout.
 *
 *   node scripts/test-split-pack.mjs
 *
 * Caso de referencia: gorras. 1 unidad 18×11×20, 5 unidades entran en
 * 25×14×20 (medición de depósito, 2026-08-13).
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const jiti = require("jiti")(import.meta.filename, { interopDefault: true });

const { splitIntoBundles, forceSingleBundle } = jiti("../src/lib/paqar/split.ts");
const { quoteShipment } = jiti("../src/lib/paqar/rates.ts");

const GORRA = {
  id: "381",
  name: "Gorra Trucker",
  weight: 60,
  height: 20,
  width: 11,
  depth: 18,
  price: 2003,
  category: "Gorras",
};

const GORRA_PACK = {
  ...GORRA,
  packQty: 5,
  packHeight: 20,
  packWidth: 14,
  packDepth: 25,
};

const TAZA = {
  id: "900",
  name: "Taza",
  weight: 350,
  height: 9,
  width: 7,
  depth: 8,
  price: 3000,
  category: "Tazas",
};

let failures = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  const mark = ok ? "OK  " : "FALLA";
  console.log(`${mark} ${label}`);
  if (!ok) {
    console.log(`      esperado: ${JSON.stringify(expected)}`);
    console.log(`      obtenido: ${JSON.stringify(actual)}`);
  }
}

function dims(bundle) {
  return [bundle.height, bundle.width, bundle.depth];
}

/** Precio a domicilio en zona 1 (CABA), con IVA, como lo ve el cliente. */
function homePrice(bundles) {
  const q = quoteShipment({
    bundles,
    destState: "C",
    destZip: "1425",
    deliveryTypes: ["homeDelivery"],
  });
  return q.options[0].total;
}

console.log("\n── Sin caja de apilado cargada: se comporta como antes ──");

const sinPack = splitIntoBundles([{ ...GORRA, quantity: 5 }]);
check("5 gorras sin pack → 1 bulto", sinPack.length, 1);
check("5 gorras sin pack → cubo de 28", dims(sinPack[0]), [28, 28, 28]);
console.log(`      cotiza $${homePrice(sinPack).toLocaleString("es-AR")}`);

console.log("\n── Con caja de apilado ──");

const cinco = splitIntoBundles([{ ...GORRA_PACK, quantity: 5 }]);
check("5 gorras con pack → 1 bulto", cinco.length, 1);
check("5 gorras con pack → caja medida 20×14×25", dims(cinco[0]), [20, 14, 25]);
check("5 gorras con pack → peso real intacto", cinco[0].weightGrams, 300);
const precioCinco = homePrice(cinco);
console.log(`      cotiza $${precioCinco.toLocaleString("es-AR")}`);
// Contra la caja medida cotizada como bulto suelto, no contra un precio fijo:
// la grilla de CA se actualiza y el número se vence (pasó de $8.829 a $9.270).
const precioCaja = homePrice([{ ...cinco[0], height: 20, width: 14, depth: 25 }]);
check("5 gorras con pack cotizan igual que la caja real", precioCinco, precioCaja);

const una = splitIntoBundles([{ ...GORRA_PACK, quantity: 1 }]);
check("1 gorra → medida unitaria sin tocar", dims(una[0]), [20, 11, 18]);

const dos = splitIntoBundles([{ ...GORRA_PACK, quantity: 2 }]);
const volDos = dos[0].height * dos[0].width * dos[0].depth;
check("2 gorras → declara menos que la caja de 5", volDos < 20 * 14 * 25, true);
check("2 gorras → declara mas que 1 sola", volDos > 20 * 11 * 18, true);
console.log(`      2 gorras: ${dims(dos[0]).join("×")} = ${volDos} cm³`);

// 10 unidades = 2 packs. El incremento NO se extrapola al infinito.
const diez = splitIntoBundles([{ ...GORRA_PACK, quantity: 10 }]);
const volDiez = diez.reduce((s, b) => s + b.height * b.width * b.depth, 0);
// Encastre de corrido: 1 gorra entera + 9 × 760 cm³ = 10.800 cm³ como mínimo,
// y menos que 2 cajas de 5 sueltas (14.000), que era el cálculo viejo.
check("10 gorras → al menos el encastre continuo", volDiez >= 3960 + 9 * 760, true);
check("10 gorras → menos que 2 cajas de 5", volDiez < 2 * 7000, true);

// Pedido #17841 (2026-08): 50 gorras, depósito las mandó en 65×27×27 = 47.385 cm³.
const cincuenta = splitIntoBundles([{ ...GORRA_PACK, quantity: 50 }]);
const volCincuenta = cincuenta.reduce((s, b) => s + b.height * b.width * b.depth, 0);
check("50 gorras → 1 bulto", cincuenta.length, 1);
check("50 gorras → no declara más que la caja real", volCincuenta <= 47385, true);
console.log(`      50 gorras: ${volCincuenta} cm³ declarados (caja real 47.385)`);
console.log(`      10 gorras: ${diez.length} bulto(s), ${volDiez} cm³ declarados`);

console.log("\n── Datos mal cargados: se ignora el pack ──");

const packAbsurdo = splitIntoBundles([
  { ...GORRA, quantity: 5, packQty: 5, packHeight: 1, packWidth: 1, packDepth: 1 },
]);
check("caja de pack mas chica que 1 unidad → ignorada", dims(packAbsurdo[0]), [28, 28, 28]);

const packInflado = splitIntoBundles([
  { ...GORRA, quantity: 5, packQty: 5, packHeight: 100, packWidth: 100, packDepth: 100 },
]);
check("caja de pack mayor a 5 unidades sueltas → ignorada", dims(packInflado[0]), [28, 28, 28]);

const packSinDims = splitIntoBundles([{ ...GORRA, quantity: 5, packQty: 5 }]);
check("pack_qty sin medidas → ignorado", dims(packSinDims[0]), [28, 28, 28]);

console.log("\n── No contamina a los productos que no se apilan ──");

const tazas = splitIntoBundles([{ ...TAZA, quantity: 36 }]);
const volTazas = tazas.reduce((s, b) => s + b.height * b.width * b.depth, 0);
check("36 tazas sin pack → sigue reconciliando por volumen", volTazas >= 36 * 9 * 7 * 8, true);
console.log(`      36 tazas: ${tazas.length} bulto(s), ${volTazas} cm³`);

const mixto = splitIntoBundles([
  { ...GORRA_PACK, quantity: 5 },
  { ...TAZA, quantity: 2 },
]);
check("carrito mixto → 1 bulto consolidado", mixto.length, 1);
const volMixto = mixto[0].height * mixto[0].width * mixto[0].depth;
check("carrito mixto → no usa la caja exacta del pack", volMixto > 7000, true);
console.log(`      mixto: ${dims(mixto[0]).join("×")} = ${volMixto} cm³`);

console.log("\n── Colores mezclados: variaciones que heredan la misma caja ──");

const colores = (porColor) =>
  ["381", "382", "383", "384", "385"].map((id) => ({ ...GORRA_PACK, id, quantity: porColor }));

const cincoColores = splitIntoBundles(colores(1));
check("5 gorras de 5 colores → caja medida", dims(cincoColores[0]), [20, 14, 25]);
check("5 gorras de 5 colores cotizan igual que 5 de un color", homePrice(cincoColores), precioCinco);

const diezColores = splitIntoBundles(colores(2));
check("10 gorras en 5 colores cotizan igual que 10 de un color", homePrice(diezColores), homePrice(diez));

const tresMasDos = splitIntoBundles([
  { ...GORRA_PACK, id: "381", quantity: 3 },
  { ...GORRA_PACK, id: "382", quantity: 2 },
]);
check("3 azules + 2 rojas → caja medida", dims(tresMasDos[0]), [20, 14, 25]);

const forzadoColores = forceSingleBundle(colores(1));
check("forceSingleBundle con 5 colores → caja medida", dims(forzadoColores[0]), [20, 14, 25]);

console.log("\n── forceSingleBundle (override del admin) ──");

const forzado = forceSingleBundle([{ ...GORRA_PACK, quantity: 5 }]);
check("forceSingleBundle respeta la caja medida", dims(forzado[0]), [20, 14, 25]);

console.log(
  failures === 0
    ? "\nTodo OK\n"
    : `\n${failures} comprobacion(es) FALLARON\n`
);
process.exit(failures === 0 ? 0 : 1);
