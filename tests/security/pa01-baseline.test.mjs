// PA-01 WU-01: deliberately RED baseline contract checks.
// Run: node --test tests/security/pa01-baseline.test.mjs
// These source-level checks are scaffolding, NOT a substitute for integration tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const root = new URL("../../app/api/sanctum/", import.meta.url);
function routes(directory) {
  const found = [];
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) found.push(...routes(path));
    else if (item.name === "route.ts") found.push(path);
  }
  return found;
}

test("inventory: 16 Sanctum API route files, including login/logout", () => {
  const paths = routes(root.pathname);
  assert.equal(paths.length, 16, "Reconcile route inventory before modifying guards");
  assert.equal(paths.filter((p) => !/\/(login|logout)\/route\.ts$/.test(p)).length, 14);
});

test("D1: login limiter is not process-local only [expected RED]", () => {
  const source = read("lib/sanctum/rateLimit.ts");
  assert.doesNotMatch(source, /new Map\s*</, "Distributed atomic limiter required");
});

test("D2/D4: sessions do not use ADMIN_PASSWORD for HMAC signing [expected RED]", () => {
  const source = read("lib/sanctum/auth.ts");
  assert.doesNotMatch(source, /createHmac/, "Replace signed legacy tokens with opaque sessions");
});

test("D2: a Redis session registry adapter exists [expected RED]", () => {
  assert.doesNotThrow(() => read("lib/sanctum/session.ts"), "Session registry module required");
});

test("D3: a shared origin security guard exists [expected RED]", () => {
  assert.doesNotThrow(() => read("lib/sanctum/requestSecurity.ts"), "Exact-origin guard required");
});

test("D2: logout invokes server-side session revocation [expected RED]", () => {
  const source = read("app/api/sanctum/logout/route.ts");
  assert.match(source, /revoke|invalidate|deleteSession/i, "Cookie clearing alone is insufficient");
});
