/**
 * In-memory brute-force guard for /api/sanctum/login — deliberately not a
 * database or external rate-limiting service, per the "no new dependency
 * unless required" constraint. State lives in this module-level Map, so it
 * resets on cold start and isn't shared across concurrent Vercel instances.
 * That's an acceptable trade-off here: it still meaningfully slows down
 * automated guessing on a warm instance, and it backs the constant-time
 * password comparison in lib/sanctum/auth.ts rather than replacing it.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

interface AttemptRecord {
  count: number;
  windowStart: number;
  blockedUntil: number | null;
}

const attempts = new Map<string, AttemptRecord>();

export function isBlocked(key: string): boolean {
  const record = attempts.get(key);
  if (!record?.blockedUntil) return false;
  return Date.now() < record.blockedUntil;
}

export function getRetryAfterSeconds(key: string): number {
  const record = attempts.get(key);
  if (!record?.blockedUntil) return 0;
  return Math.max(0, Math.ceil((record.blockedUntil - Date.now()) / 1000));
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now, blockedUntil: null });
    return;
  }

  const count = record.count + 1;
  const blockedUntil = count >= MAX_ATTEMPTS ? now + BLOCK_MS : null;
  attempts.set(key, { count, windowStart: record.windowStart, blockedUntil });
}

export function recordSuccess(key: string): void {
  attempts.delete(key);
}
