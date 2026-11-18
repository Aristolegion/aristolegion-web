import { createHash } from "node:crypto";
import { isIP } from "node:net";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PREFIX = "pa01:nonprod:login:v1:";

// Redis EVAL is atomic across workers. Count every admitted login attempt BEFORE
// password verification, so simultaneous requests cannot bypass the threshold.
export const ADMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1])) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 1 then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[1]))
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

function clientKey(request: Request): string {
  // Vercel overwrites its own forwarded IP header at its ingress. Never use
  // arbitrary user-provided x-forwarded-for or trust headers outside Vercel.
  if (process.env.VERCEL !== "1") throw new Error("Untrusted ingress");
  const address = request.headers.get("x-vercel-forwarded-for");
  if (!address || address !== address.trim() || isIP(address) === 0) {
    throw new Error("Missing trusted client address");
  }
  return PREFIX + createHash("sha256").update(address).digest("hex");
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis not configured");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Invalid Redis endpoint");
  }
  const response = await fetch(parsed.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error("Redis unavailable");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("result" in body) || "error" in body) {
    throw new Error("Redis command failed");
  }
  return body.result;
}

export interface Admission {
  allowed: boolean;
  retryAfterSeconds: number;
  key: string;
}

export async function admitLoginAttempt(request: Request): Promise<Admission> {
  const key = clientKey(request);
  const result = await redisCommand(["EVAL", ADMIT_SCRIPT, 1, key, WINDOW_MS]);
  if (!Array.isArray(result) || result.length !== 2 ||
      !result.every(value => typeof value === "number" && Number.isSafeInteger(value))) {
    throw new Error("Invalid Redis admission response");
  }
  const [count, ttl] = result as number[];
  if (count < 1 || ttl < 1 || ttl > WINDOW_MS) throw new Error("Invalid Redis admission state");
  return { allowed: count <= MAX_ATTEMPTS, retryAfterSeconds: count <= MAX_ATTEMPTS ? 0 : Math.max(1, Math.ceil(ttl / 1000)), key };
}

