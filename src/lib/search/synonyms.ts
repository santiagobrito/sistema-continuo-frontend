/**
 * Search synonyms & fuzzy matching for Sistema Continuo
 *
 * Handles:
 * 1. Synonyms: "manual" → also search "mano", "portatil"
 * 2. Common misspellings in the sublimation/printing niche
 * 3. Abbreviations: "estampa" → "estampadora"
 * 4. Accent insensitivity: "carton" matches "cartón", "imprimir" matches "imprímir"
 */

/**
 * Strip Spanish diacritics so "cartón"/"carton" or "ñ"/"n" compare equal.
 * Used as the canonical form for synonyms, misspellings and product scoring.
 */
export function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Synonym groups: any word in a group can match any other
// When a user searches for one word, we also try the others.
//
// Single-word groups (no synonyms) are used to PROTECT a word from fuzzy
// correction — e.g. "cinta" without protection would Levenshtein-collapse
// to "tinta" (dist=1) and a "cinta autoadhesiva" search would surface tintas.
const SYNONYM_GROUPS: string[][] = [
  // Estampadoras
  ["manual", "mano", "portatil", "portable"],
  ["plancha", "estampadora", "prensa", "sublimadora", "heat press"],
  ["plana", "flat", "plato"],
  ["automatica", "auto", "neumatica"],

  // Protected (no synonyms — exist as real product terms vulnerable to typo collapse)
  ["cinta"],

  // Plotters / Corte
  ["plotter", "cortadora", "cortante", "cutter"],
  ["silhouette", "silueta", "siluet"],
  ["cameo", "kameo"],
  ["cuchilla", "blade", "navaja"],
  ["mat", "tapete", "alfombrilla", "base de corte"],

  // Tintas
  ["tinta", "ink", "cartucho"],
  ["sublimacion", "sublimar", "sublimable", "sublimado"],
  ["pigmentada", "pigmento"],
  ["fotografica", "foto", "photo"],
  ["recarga", "refill", "rellenar"],

  // Papeles
  ["papel", "hoja", "resma"],
  ["glossy", "brillante", "brillo"],
  ["matte", "mate", "opaco"],
  ["transfer", "transferencia", "termotransferible"],
  ["autoadhesivo", "adhesivo", "sticker", "etiqueta"],

  // Sublimables
  ["taza", "mug", "jarro", "pocillo"],
  ["remera", "camiseta", "playera", "polera"],
  ["gorra", "cap", "trucker", "visera"],
  ["llavero", "keychain"],
  ["mousepad", "mouse pad", "alfombrilla mouse"],
  ["funda", "case", "carcasa", "protector"],
  ["rompecabezas", "puzzle"],
  ["polimero", "polymer"],

  // Vinilos
  ["vinilo", "vinyl"],
  ["textil", "tela", "ropa"],
  ["termotransferible", "htv", "heat transfer"],
  ["flock", "aterciopelado", "terciopelo"],

  // Impresoras
  ["impresora", "printer"],
  ["epson", "epsn"],
  ["canon", "cannón"],
  ["sistema continuo", "ciss", "sistema de tinta"],

  // General
  ["combo", "kit", "pack", "set"],
  ["repuesto", "accesorio", "spare"],
  ["grande", "gran formato", "xl", "wide"],
  ["chico", "mini", "pequeno", "small"],
  ["rollo", "bobina", "roll"],
];

// Common misspellings → correct form
const MISSPELLINGS: Record<string, string> = {
  // Estampadoras
  estampadra: "estampadora",
  estampadroa: "estampadora",
  estanpadora: "estampadora",
  estampardora: "estampadora",
  sublimadra: "sublimadora",

  // Silhouette (muy comun equivocarse)
  silouette: "silhouette",
  silhuette: "silhouette",
  silueta: "silhouette",
  siluet: "silhouette",
  silhoette: "silhouette",
  silouete: "silhouette",
  silhuete: "silhouette",
  shilouette: "silhouette",

  // Marcas
  artanio: "artanium",
  senco: "senko",
  kian: "kiian",

  // Productos
  ploter: "plotter",
  plottr: "plotter",
  ploer: "plotter",
  cuchila: "cuchilla",
  cuchiya: "cuchilla",
  vinlo: "vinilo",
  vinio: "vinilo",
  papael: "papel",
  paple: "papel",
  taza: "taza",
  tasa: "taza",
  remra: "remera",
  rmera: "remera",
  goraa: "gorra",
  gora: "gorra",
  impresoa: "impresora",
  impresor: "impresora",
  fotografico: "fotografica",
  fotográfico: "fotografica",
};

// Normalized misspellings index (keys without accents) — los lookups usan
// la forma stripAccents() del input para que "fotografico"/"fotográfico"/
// "fotográficó" matcheen el mismo arreglo.
const MISSPELLINGS_NORM: Record<string, string> = Object.fromEntries(
  Object.entries(MISSPELLINGS).map(([k, v]) => [stripAccents(k), v]),
);

/**
 * Expand a search query with synonyms.
 * Returns array of alternative queries to try.
 *
 * "estampadora manual" → ["estampadora manual", "estampadora mano", "estampadora portatil"]
 */
export function expandWithSynonyms(query: string): string[] {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length >= 2);
  const wordsNorm = words.map(stripAccents);
  const results = new Set<string>();
  results.add(lower);
  results.add(stripAccents(lower));

  for (let i = 0; i < wordsNorm.length; i++) {
    const wordNorm = wordsNorm[i];

    for (const group of SYNONYM_GROUPS) {
      const groupNorm = group.map(stripAccents);
      const hit = groupNorm.findIndex(
        (synNorm) =>
          synNorm === wordNorm ||
          wordNorm.includes(synNorm) ||
          synNorm.includes(wordNorm),
      );
      if (hit >= 0) {
        for (let j = 0; j < group.length; j++) {
          if (j === hit) continue;
          if (groupNorm[j] === wordNorm) continue;
          const alt = [...wordsNorm];
          alt[i] = group[j];
          results.add(alt.join(" "));
        }
      }
    }
  }

  return Array.from(results);
}

/**
 * Fix common misspellings in a query.
 * Returns corrected query or original if no fix found.
 */
export function fixMisspellings(query: string): string {
  const words = query.toLowerCase().split(/\s+/);
  let changed = false;

  const fixed = words.map((word) => {
    const norm = stripAccents(word);
    const replacement = MISSPELLINGS_NORM[norm];
    if (replacement) {
      changed = true;
      return replacement;
    }
    return word;
  });

  return changed ? fixed.join(" ") : query;
}

/**
 * Levenshtein distance between two strings.
 * Used for fuzzy matching when no results found.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  return dp[m][n];
}

/**
 * Find the closest known product word for a misspelled word.
 * Only returns a match if distance <= 2 (max 2 typos).
 */
export function fuzzyCorrect(word: string): string | null {
  if (word.length < 3) return null;

  const lower = word.toLowerCase();
  const lowerNorm = stripAccents(lower);

  // Check misspellings dictionary (accent-insensitive) first
  if (MISSPELLINGS_NORM[lowerNorm]) return MISSPELLINGS_NORM[lowerNorm];

  // Dynamic threshold: short words (3-4 chars) requieren match exacto en
  // misspellings, palabras de 5+ chars aceptan 1 edit. Antes era hasta 2
  // edits, lo que convertía "carton"→"canon" (palabras diferentes pero
  // cercanas) y rompía búsquedas legítimas.
  const maxDist = lowerNorm.length >= 5 ? 1 : 0;
  if (maxDist === 0) return null;

  const allKnownWords = SYNONYM_GROUPS.flat();
  allKnownWords.push(...Object.values(MISSPELLINGS));

  // If the original word IS already a known valid term, never correct it.
  // Without this guard "cinta" → "tinta" (dist=1) and "pinta" → "tinta" etc.
  if (allKnownWords.some((k) => stripAccents(k) === lowerNorm)) return null;

  let bestMatch: string | null = null;
  let bestDist = maxDist + 1;

  for (const known of allKnownWords) {
    const knownNorm = stripAccents(known);
    if (Math.abs(knownNorm.length - lowerNorm.length) > maxDist) continue;
    const dist = levenshtein(lowerNorm, knownNorm);
    if (dist > 0 && dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      bestMatch = known;
    }
  }

  return bestMatch;
}

/**
 * Full query processing: fix typos → expand synonyms → return all variants
 */
export function processSearchQuery(query: string): {
  corrected: string;
  variants: string[];
  wasCorrected: boolean;
} {
  // Step 1: Fix known misspellings
  let corrected = fixMisspellings(query);
  let wasCorrected = corrected !== query;

  // Step 2: Try fuzzy correction on each word
  if (!wasCorrected) {
    const words = query.toLowerCase().split(/\s+/);
    const fuzzyFixed = words.map((w) => {
      const fix = fuzzyCorrect(w);
      if (fix && fix !== w) {
        wasCorrected = true;
        return fix;
      }
      return w;
    });
    if (wasCorrected) {
      corrected = fuzzyFixed.join(" ");
    }
  }

  // Step 3: Expand with synonyms
  const variants = expandWithSynonyms(corrected);

  return { corrected, variants, wasCorrected };
}
