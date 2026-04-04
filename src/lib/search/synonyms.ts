/**
 * Search synonyms & fuzzy matching for Sistema Continuo
 *
 * Handles:
 * 1. Synonyms: "manual" → also search "mano", "portatil"
 * 2. Common misspellings in the sublimation/printing niche
 * 3. Abbreviations: "estampa" → "estampadora"
 */

// Synonym groups: any word in a group can match any other
// When a user searches for one word, we also try the others
const SYNONYM_GROUPS: string[][] = [
  // Estampadoras
  ["manual", "mano", "portatil", "portable"],
  ["plancha", "estampadora", "prensa", "sublimadora", "heat press"],
  ["plana", "flat", "plato"],
  ["automatica", "auto", "neumatica"],

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

/**
 * Expand a search query with synonyms.
 * Returns array of alternative queries to try.
 *
 * "estampadora manual" → ["estampadora manual", "estampadora mano", "estampadora portatil"]
 */
export function expandWithSynonyms(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  const results = new Set<string>();
  results.add(query.toLowerCase());

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Find synonym groups containing this word
    for (const group of SYNONYM_GROUPS) {
      const match = group.find((syn) => syn === word || word.includes(syn) || syn.includes(word));
      if (match) {
        // Create alternative queries replacing this word with each synonym
        for (const synonym of group) {
          if (synonym !== word && synonym !== match) {
            const alt = [...words];
            alt[i] = synonym;
            results.add(alt.join(" "));
          }
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
    if (MISSPELLINGS[word]) {
      changed = true;
      return MISSPELLINGS[word];
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

  // Check misspellings dictionary first
  if (MISSPELLINGS[lower]) return MISSPELLINGS[lower];

  // Check against all known words in synonym groups
  let bestMatch: string | null = null;
  let bestDist = 3; // max distance threshold

  const allKnownWords = SYNONYM_GROUPS.flat();
  // Also add misspelling targets
  allKnownWords.push(...Object.values(MISSPELLINGS));

  for (const known of allKnownWords) {
    if (Math.abs(known.length - lower.length) > 2) continue; // Skip if length too different
    const dist = levenshtein(lower, known);
    if (dist < bestDist) {
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
