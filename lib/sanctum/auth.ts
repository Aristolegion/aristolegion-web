import { timingSafeEqual } from "node:crypto";
export const SANCTUM_SESSION_COOKIE = "aristolegion_sanctum_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export function verifyAdminPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const supplied = Buffer.from(candidate);
  const expected = Buffer.from(password);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
// Legacy signed-token creation and validation intentionally removed.
