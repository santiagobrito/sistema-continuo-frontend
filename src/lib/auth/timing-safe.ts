/**
 * Comparación de strings constant-time para secrets (HMAC sigs, API keys).
 *
 * Reemplazar `a === b` o `a !== b` por estas funciones cuando se compara contra
 * un secreto. `===` en JavaScript hace short-circuit en el primer byte distinto,
 * permitiendo timing attacks (medir cuántos ms tarda el === a través de N
 * requests para forge un secret byte por byte).
 */

import { timingSafeEqual } from "crypto";

export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  // Buffer.from(str) usa UTF-8. Si los strings tienen length distinto en bytes
  // (caracteres multibyte) timingSafeEqual tira, así que chequeo length de buffer.
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
