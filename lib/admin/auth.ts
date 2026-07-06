import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Simple password-gate for the founder-only /admin dashboard — not a full
 * auth system (no user accounts, no Supabase Auth). ADMIN_PASSWORD is a
 * server-only env var (no NEXT_PUBLIC_ prefix), read only inside Route
 * Handlers and Server Components, and never sent to the client.
 *
 * The session cookie stores a SHA-256 hash of the password, not the
 * password itself, so it never appears in plaintext in browser storage or
 * network traffic beyond the initial login POST body.
 */
export const ADMIN_SESSION_COOKIE = "aristolegion_admin_session";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function verifyAdminPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return constantTimeEquals(candidate, password);
}

export function getAdminSessionToken(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }
  return hash(password);
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    return constantTimeEquals(token, getAdminSessionToken());
  } catch {
    return false;
  }
}
