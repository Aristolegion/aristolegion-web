// ES-012 Implementation Specification §Q — a dedicated module rather
// than a modification to lib/sanctum/rateLimit.ts's existing
// security-sensitive implementation. Same in-memory, module-level Map
// pattern (state resets on cold start, not shared across concurrent
// instances — an explicitly accepted trade-off for v1, the same one
// Sanctum's own rate limiter accepts).
//
// Semantically different from Sanctum's limiter: this counts every
// request in the window, not just failed ones — the ratified rule is
// "5 requests per 15-minute window", full stop, regardless of outcome.

const MAX_REQUESTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

interface RequestRecord {
  count: number;
  windowStart: number;
  blockedUntil: number | null;
}

const requests = new Map<string, RequestRecord>();

export interface RateLimitCheck {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Must be called before retrieve() (§Q) — this endpoint's real cost
 * begins at the embedding call inside retrieve(), so gating only before
 * generation would still let unlimited free retrieval load through.
 */
export function checkAndRecordRequest(key: string): RateLimitCheck {
  const now = Date.now();
  const record = requests.get(key);

  if (record?.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000) };
  }

  if (!record || now - record.windowStart > WINDOW_MS) {
    requests.set(key, { count: 1, windowStart: now, blockedUntil: null });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const count = record.count + 1;
  if (count > MAX_REQUESTS) {
    const blockedUntil = now + BLOCK_MS;
    requests.set(key, { count, windowStart: record.windowStart, blockedUntil });
    return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) };
  }

  requests.set(key, { count, windowStart: record.windowStart, blockedUntil: null });
  return { allowed: true, retryAfterSeconds: 0 };
}
