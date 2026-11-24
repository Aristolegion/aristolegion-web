import assert from "node:assert/strict";

import { isolatedTarget } from "./wu03-live-target.mjs";
const target = isolatedTarget();
const secret = process.env.PA01_VERCEL_BYPASS_SECRET;
assert.ok(secret && secret.length >= 16, "Missing bypass secret");
const endpoint = new URL("/api/sanctum/login", target);
const results = [];
try {
  for (let i = 1; i <= 2; i++) {
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/json",
      "origin": target.origin,
        "x-vercel-protection-bypass": secret,
        "user-agent": "pa01-wu02-fail-closed-test",
      },
      body: JSON.stringify({ password: "PA01-INVALID-NONPROD-ONLY" }),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await response.text()).slice(0, 1000);
    const contentType = response.headers.get("content-type") ?? "";
    const result = { attempt: i, status: response.status, sessionCookie: response.headers.has("set-cookie"), contentType };
    assert.match(contentType, /application\/json/i, "Expected JSON response from application, not a Vercel deployment status page");
    results.push(result);
    assert.ok(!body.includes("Protected by Vercel Authentication"), "Vercel protection intercepted request");
    assert.ok(!body.includes('"protection"'), "Vercel protection intercepted request");
    assert.equal(result.status, 503, "Missing Redis configuration must return 503");
    assert.equal(result.sessionCookie, false, "Redis failure must never issue a session cookie");
  }
  console.log(JSON.stringify({ verdict: "PASS", failureMode: "missing-branch-scoped-redis-credentials", results }));
} catch (error) {
  console.error(JSON.stringify({ verdict: "FAIL", results, reason: "Verification assertion or request failed" }));
  process.exitCode = 1;
}
