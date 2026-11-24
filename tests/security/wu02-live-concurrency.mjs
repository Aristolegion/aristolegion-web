import assert from "node:assert/strict";

import { isolatedTarget } from "./wu03-live-target.mjs";
const target = isolatedTarget();
const bypass = process.env.PA01_VERCEL_BYPASS_SECRET;
assert.ok(bypass && bypass.length >= 16, "GitHub Actions bypass secret missing");
const endpoint = new URL("/api/sanctum/login", target);
async function probe(i) {
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "origin": target.origin,
      "x-vercel-protection-bypass": bypass,
      "user-agent": "pa01-wu02-concurrency-test",
    },
    body: JSON.stringify({ password: "PA01-INVALID-NONPROD-ONLY" }),
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.text();
  assert.ok(!body.includes("Protected by Vercel Authentication"), "Vercel protection intercepted request");
  assert.ok(!body.includes('"protection"'), "Vercel protection intercepted request");
  assert.equal(response.headers.has("set-cookie"), false, "Invalid password issued a cookie");
  return { request: i, status: response.status, retryAfter: response.headers.get("retry-after") };
}
try {
  // Run against a dedicated preview with a fresh client counter.
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => probe(i + 1)));
  const statuses = results.map(r => r.status);
  const admitted = statuses.filter(x => x === 401).length;
  const rejected = statuses.filter(x => x === 429).length;
  assert.equal(admitted, 5, "Exactly five parallel requests must be admitted");
  assert.equal(rejected, 3, "Exactly three parallel requests must be rejected");
  assert.ok(results.filter(x => x.status === 429).every(x => Number(x.retryAfter) > 0), "Blocked requests require Retry-After");
  console.log(JSON.stringify({ verdict: "PASS", admitted, rejected, results }));
} catch (error) {
  console.error(JSON.stringify({ verdict: "FAIL", reason: "Verification assertion or request failed" }));
  process.exitCode = 1;
}
