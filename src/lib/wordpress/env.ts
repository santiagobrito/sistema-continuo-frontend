/**
 * Config central de URLs/secrets de WordPress.
 *
 * Importar desde aquí en lugar de redefinir `process.env.WP_URL || ""` en cada
 * route. Fail-fast si la env crítica no está seteada — mejor crashear que correr
 * con URLs vacías que fallan silenciosamente (requests a `/wp-json/...` relativo).
 */

const _WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL;
if (!_WP_URL) {
  throw new Error(
    "WP_URL (o NEXT_PUBLIC_WP_URL) no configurado. Setear en EasyPanel env del frontend."
  );
}
export const WP_URL: string = _WP_URL;

// Convenience: base de la REST API custom de SC
export const SC_API_BASE = `${WP_URL}/wp-json/sistema-continuo/v1`;

// Convenience: base de la REST API nativa WC (requiere WC_API_AUTH header)
export const WC_API_BASE = `${WP_URL}/wp-json/wc/v3`;
