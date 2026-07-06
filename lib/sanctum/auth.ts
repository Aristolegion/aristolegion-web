import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Password-gate for the founder-only /sanctum dashboard — not a full auth
 * system (no user accounts, no Supabase Auth). ADMIN_PASSWORD is a
 * server-only env var (no NEXT_PUBLIC_ prefix), read only inside Route
 * Handlers and Server Components, and never sent to the client.
 *
 * Session tokens are `${issuedAt}.${hmac}`, signed with ADMIN_PASSWORD as the
 * HMAC key. Validation re-derives the signature and checks the embedded
 * issuedAt against SESSION_MAX_AGE_SECONDS, so expiry is enforced
 * server-side even if a copied cookie outlives the browser's own maxAge.
 * Rotating ADMIN_PASSWORD invalidates every outstanding session as a
 * side effect.
 */
export const SANCTUM_SESSION_COOKIE = "aristolegion_sanctum_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function sign(issuedAt: string): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }
  return createHmac("sha256", password).update(issuedAt).digest("hex");
}

export function verifyAdminPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return constantTimeEquals(candidate, password);
}

export function createSessionToken(): string {
  const issuedAt = String(Date.now());
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const separatorIndex = token.indexOf(".");
  if (separatorIndex === -1) return false;

  const issuedAt = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!issuedAt || !signature) return false;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) return false;

  const ageMs = Date.now() - issuedAtMs;
  if (ageMs < 0 || ageMs > SESSION_MAX_AGE_SECONDS * 1000) return false;

  try {
    return constantTimeEquals(signature, sign(issuedAt));
  } catch {
    return false;
  }
}
