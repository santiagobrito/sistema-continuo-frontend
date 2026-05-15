/**
 * Session management — HMAC signed cookies
 *
 * Creates and verifies session tokens stored in HttpOnly cookies.
 * No JWT dependency — simple HMAC with expiration.
 */

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

// Fail-fast LAZY: si AUTH_SECRET no está al INVOCAR sign(), throw. No tiramos
// al cargar el módulo porque Next.js evalúa lib durante el build (cuando las
// env vars de runtime aún no están seteadas) y rompería el build.
let _authSecretCache: string | null = null;
function getAuthSecret(): string {
  if (_authSecretCache) return _authSecretCache;
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32 || s.includes("placeholder") || s.includes("change_me")) {
    throw new Error(
      "AUTH_SECRET no seteado o usa valor placeholder/débil. Generar con: openssl rand -hex 32 y setear en env."
    );
  }
  _authSecretCache = s;
  return s;
}
const SESSION_COOKIE = "sc_session";
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

function sign(payload: string): string {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

export async function createSession(user: SessionUser): Promise<void> {
  const expires = Date.now() + SESSION_EXPIRY;
  const payload = JSON.stringify({ ...user, exp: expires });
  const signature = sign(payload);
  const token = Buffer.from(payload).toString("base64") + "." + signature;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY / 1000,
    path: "/",
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  try {
    const payload = Buffer.from(payloadB64, "base64").toString();
    const expectedSig = sign(payload);
    // timingSafeEqual evita timing attacks que permitirían forge gradual de cookies.
    if (sig.length !== expectedSig.length) return null;
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    const data = JSON.parse(payload);
    if (data.exp < Date.now()) return null;

    return { id: data.id, email: data.email, name: data.name, role: data.role };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
