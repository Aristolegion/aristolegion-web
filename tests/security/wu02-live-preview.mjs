import assert from "node:assert/strict";

import { isolatedTarget } from "./wu03-live-target.mjs";
const target = isolatedTarget();
const secret = process.env.PA01_VERCEL_BYPASS_SECRET;
assert.ok(secret && secret.length >= 16, "Configure PA01_VERCEL_BYPASS_SECRET as a GitHub Actions secret");
const endpoint = new URL("/api/sanctum/login", target);
const invalidPassword = "PA01-INVALID-NONPROD-ONLY";
const baseHeaders = {
  "content-type": "application/json",
      "origin": target.origin,
  "x-vercel-protection-bypass": secret,
  "user-agent": "pa01-wu02-controlled-verification",
};
const results = [];
async function probe(name, additionalHeaders = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: { ...baseHeaders, ...additionalHeaders },
    body: JSON.stringify({ password: invalidPassword }),
    signal: AbortSignal.timeout(10000),
  });
  const body = (await response.text()).slice(0, 1500);
  const result = {
    name,
    status: response.status,
    retryAfter: response.headers.get("retry-after"),
    sessionCookie: response.headers.has("set-cookie"),
  };
  results.push(result);
  assert.equal(result.sessionCookie, false, name + ": invalid credentials must not set cookies");
  assert.ok(!body.includes("Protected by Vercel Authentication"), name + ": Vercel protection intercepted request");
  assert.ok(!body.includes('"protection"'), name + ": Vercel protection intercepted request");
  assert.ok(![301, 302, 303, 307, 308].includes(result.status), name + ": unexpected redirect");
  assert.notEqual(result.status, 503, name + ": limiter unavailable or ingress not trusted; inspect preview logs");
  return result;
}
try {
  // A fresh, isolated preview and unused client identity are required.
  for (let i = 1; i <= 5; i++) {
    const result = await probe("attempt-" + i);
    assert.equal(result.status, 401, "Expected admitted invalid password on attempt " + i);
  }
  const blocked = await probe("attempt-6");
  assert.equal(blocked.status, 429, "Sixth attempt must be rate limited");
  assert.ok(Number(blocked.retryAfter) >= 1, "429 must provide positive Retry-After");
  for (const [name, headers] of [
    ["spoof-x-forwarded-for", { "x-forwarded-for": "198.51.100.41" }],
    ["spoof-x-real-ip", { "x-real-ip": "198.51.100.42" }],
    ["spoof-x-vercel-forwarded-for", { "x-vercel-forwarded-for": "198.51.100.43" }],
  ]) {
    const result = await probe(name, headers);
    assert.equal(result.status, 429, name + ": spoofed header must not bypass blocked identity");
  }
  console.log(JSON.stringify({ verdict: "PASS", results }));
} catch (error) {
  console.error(JSON.stringify({ verdict: "FAIL", results, reason: "Verification assertion or request failed" }));
  process.exitCode = 1;
}
