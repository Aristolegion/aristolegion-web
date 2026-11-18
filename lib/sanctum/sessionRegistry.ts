import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * PA-01 WU-03: Redis-backed opaque session registry.
 *
 * This module is deliberately NOT wired into the legacy login/guards yet.
 * WU-03 cutover must update every protected route atomically.
 */
export const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SESSION_PREFIX = "pa01:nonprod:admin-session:v1:";
const REQUEST_TIMEOUT_MS = 3000;

type SessionRecord = {
  v: 1;
  createdAt: number;
  expiresAt: number;
  rotation: string;
};

function rotationFingerprint(): string {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_ROTATION_SECRET;
  if (!password || !secret || secret.length < 32) {
    throw new Error("Admin session rotation is not configured");
  }
  return createHmac("sha256", secret).update(password, "utf8").digest("hex");
}

function tokenKey(token: string): string {
  return SESSION_PREFIX + createHash("sha256").update(token, "utf8").digest("hex");
}

function validToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

async function redisCommand(command: unknown[]): Promise<unknown> {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL;
  const credential = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!endpoint || !credential) throw new Error("Redis not configured");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid Redis endpoint");
  }
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credential}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Redis unavailable");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("result" in payload) || "error" in payload) {
    throw new Error("Invalid Redis response");
  }
  return payload.result;
}

/** Issues only after Redis acknowledges the write. No raw token is persisted. */
export async function issueAdminSession(): Promise<string> {
  const rotation = rotationFingerprint();
  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  const record: SessionRecord = {
    v: 1,
    createdAt: now,
    expiresAt: now + SESSION_LIFETIME_SECONDS * 1000,
    rotation,
  };
  const result = await redisCommand([
    "SET", tokenKey(token), JSON.stringify(record), "EX", SESSION_LIFETIME_SECONDS, "NX",
  ]);
  if (result !== "OK") throw new Error("Session persistence failed");
  return token;
}

/**
 * Fail closed for malformed tokens, Redis failures, expiry, and password
 * rotation. Never accept legacy timestamp.HMAC cookies.
 */
export async function verifyAdminSession(token: unknown): Promise<boolean> {
  if (!validToken(token)) return false;
  try {
    const rotation = rotationFingerprint();
    const raw = await redisCommand(["GET", tokenKey(token)]);
    if (typeof raw !== "string") return false;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    const value = parsed as Partial<SessionRecord>;
    const now = Date.now();
    if (value.v !== 1 ||
        typeof value.createdAt !== "number" || !Number.isSafeInteger(value.createdAt) ||
        typeof value.expiresAt !== "number" || !Number.isSafeInteger(value.expiresAt) ||
        value.createdAt > now || value.expiresAt <= now ||
        value.expiresAt - value.createdAt !== SESSION_LIFETIME_SECONDS * 1000 ||
        typeof value.rotation !== "string" || !/^[a-f0-9]{64}$/.test(value.rotation)) {
      return false;
    }
    return timingSafeEqual(Buffer.from(value.rotation, "hex"), Buffer.from(rotation, "hex"));
  } catch {
    return false;
  }
}

/**
 * Throws if Redis cannot confirm deletion. Caller must not claim logout
 * revocation succeeded when the backing store is unavailable.
 */
export async function revokeAdminSession(token: unknown): Promise<void> {
  if (!validToken(token)) return;
  const result = await redisCommand(["DEL", tokenKey(token)]);
  if (result !== 0 && result !== 1) throw new Error("Session revocation failed");
}
