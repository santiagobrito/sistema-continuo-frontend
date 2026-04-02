/**
 * Session management — HMAC signed cookies
 *
 * Creates and verifies session tokens stored in HttpOnly cookies.
 * No JWT dependency — simple HMAC with expiration.
 */

import { cookies } from "next/headers";
import { createHmac } from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "sc_default_secret_change_me";
const SESSION_COOKIE = "sc_session";
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

function sign(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
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
    if (sig !== expectedSig) return null;

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
