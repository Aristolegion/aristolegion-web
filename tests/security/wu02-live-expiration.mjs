import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

import { isolatedTarget } from "./wu03-live-target.mjs";
const target = isolatedTarget();
const secret = process.env.PA01_VERCEL_BYPASS_SECRET;
assert.ok(secret && secret.length >= 16, "Missing GitHub Actions bypass secret");
const endpoint = new URL("/api/sanctum/login", target);
const results = [];
async function probe(name) {
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "origin": target.origin,
      "x-vercel-protection-bypass": secret,
      "user-agent": "pa01-wu02-expiration-test",
    },
    body: JSON.stringify({ password: "PA01-INVALID-NONPROD-ONLY" }),
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.text();
  assert.ok(!body.includes("Protected by Vercel Authentication"), "Vercel access protection intercepted request");
  assert.ok(!body.includes('"protection"'), "Vercel access protection intercepted request");
  assert.equal(response.headers.has("set-cookie"), false, "Invalid login must not set a cookie");
  const result = { name, status: response.status, retryAfter: response.headers.get("retry-after") };
  results.push(result);
  return result;
}
try {
  // The same GitHub runner sends both the initial and post-expiry requests.
  // Fresh runner identity is expected; abort rather than claim success if already blocked.
  for (let i = 1; i <= 5; i++) {
    const result = await probe("initial-" + i);
    assert.equal(result.status, 401, "Expected fresh counter, initial request " + i);
  }
  const blocked = await probe("blocked");
  assert.equal(blocked.status, 429, "Sixth request should be blocked");
  const seconds = Number(blocked.retryAfter);
  assert.ok(Number.isInteger(seconds) && seconds >= 1 && seconds <= 900, "Invalid Retry-After");
  console.log(JSON.stringify({ phase: "blocked", retryAfterSeconds: seconds, admitted: 5 }));
  await sleep((seconds + 4) * 1000);
  const after = await probe("after-expiration");
  assert.equal(after.status, 401, "After expiration, invalid password should reach authentication again");
  console.log(JSON.stringify({ verdict: "PASS", results }));
} catch (error) {
  console.error(JSON.stringify({ verdict: "FAIL", results, reason: "Verification assertion or request failed" }));
  process.exitCode = 1;
}
