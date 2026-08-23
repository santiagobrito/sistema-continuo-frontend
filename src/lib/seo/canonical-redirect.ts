/**
 * Rutas canónicas y redirecciones del catálogo.
 *
 * El routing del catálogo resuelve una página por su ÚLTIMO segmento e ignora el
 * resto: `/foo/bar/mi-producto`, `/tintas/mi-producto` y `/tienda/mi-producto`
 * devolvían todas 200 con la misma página y un canonical apuntando a otra parte.
 * Es un espacio de URLs ilimitado que nunca daba 404, y alimentaba el estado
 * "Página alternativa con etiqueta canónica adecuada" de Search Console.
 *
 * Con esto, una ruta que no es la canónica responde 308 hacia ella.
 */

/** Query string lista para concatenar ('?a=1&b=2' o '' si no hay nada). */
export function queryString(
  searchParams: Record<string, string | string[] | undefined>
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.append(key, value);
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Decide si hay que redirigir de `requested` a `canonical`.
 *
 * `minCanonicalSegments` protege de mandar a una ruta que no existe. Para
 * productos son 2: uno sin categorías canoniza a `/{slug}`, que el router del
 * catálogo no sirve, así que redirigir ahí cambiaría un 200 por un 404. Para
 * categorías es 1, porque `/{slug}` sí es una ruta válida (una categoría raíz).
 */
export function shouldRedirect(
  requested: string,
  canonical: string,
  minCanonicalSegments = 1
): boolean {
  if (!canonical || canonical === requested) return false;
  return canonical.split("/").filter(Boolean).length >= minCanonicalSegments;
}
