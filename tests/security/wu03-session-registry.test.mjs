import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import crypto from "node:crypto";

const source = fs.readFileSync(path.join(process.cwd(), "lib/sanctum/sessionRegistry.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture({ configured = true, outage = false, malformed = false, password = "initial-password" } = {}) {
  const entries = new Map();
  const calls = [];
  let now = 1_700_000_000_000;
  const env = {
    ADMIN_PASSWORD: password,
    ADMIN_SESSION_ROTATION_SECRET: "test-rotation-secret-at-least-32-characters-long",
    ...(configured ? { UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "test-only" } : {}),
  };
  const fetch = async (_url, options) => {
    if (outage) throw new Error("network offline");
    const [command, key, ...args] = JSON.parse(options.body);
    calls.push({ command, key, args });
    if (malformed) return { ok: true, json: async () => ({ wrong: "shape" }) };
    if (command === "SET") {
      assert.equal(args[1], "EX");
      assert.equal(args[2], 604800);
      assert.equal(args[3], "NX");
      if (entries.has(key)) return { ok: true, json: async () => ({ result: null }) };
      entries.set(key, { raw: args[0], expires: now + 604800000 });
      return { ok: true, json: async () => ({ result: "OK" }) };
    }
    if (command === "GET") {
      const entry = entries.get(key);
      const raw = entry && entry.expires > now ? entry.raw : null;
      return { ok: true, json: async () => ({ result: raw }) };
    }
    if (command === "DEL") {
      const removed = entries.delete(key) ? 1 : 0;
      return { ok: true, json: async () => ({ result: removed }) };
    }
    throw new Error("unexpected Redis command: " + command);
  };
  const exports = {};
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(compiled, {
    exports, require: id => {
      if (id === "node:crypto") return crypto;
      throw new Error("Unexpected module: " + id);
    },
    process: { env }, Date: Clock, Buffer, URL, AbortSignal, fetch,
  }, { timeout: 1000 });
  return {
    api: exports, entries, calls, env,
    advance: ms => { now += ms; },
    setOutage: value => { outage = value; },
  };
}

test("WU-03: 256-bit random opaque tokens are unique; Redis stores only token digests", async () => {
  const f = fixture();
  const a = await f.api.issueAdminSession();
  const b = await f.api.issueAdminSession();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(a, "base64url").length, 32);
  assert.notEqual(a, b);
  assert.equal(f.entries.size, 2);
  for (const key of f.entries.keys()) {
    assert.match(key, /^pa01:nonprod:admin-session:v1:[a-f0-9]{64}$/);
    assert.equal(key.includes(a), false);
    assert.equal(key.includes(b), false);
  }
  assert.equal(await f.api.verifyAdminSession(a), true);
  assert.equal(await f.api.verifyAdminSession(b), true);
});

test("WU-03: revocation denies replay; deletion is idempotent", async () => {
  const f = fixture();
  const token = await f.api.issueAdminSession();
  await f.api.revokeAdminSession(token);
  assert.equal(await f.api.verifyAdminSession(token), false);
  await f.api.revokeAdminSession(token);
});

test("WU-03: expiry is absolute at seven days, not sliding", async () => {
  const f = fixture();
  const token = await f.api.issueAdminSession();
  f.advance(604800000 - 1);
  assert.equal(await f.api.verifyAdminSession(token), true);
  f.advance(1);
  assert.equal(await f.api.verifyAdminSession(token), false);
});

test("WU-03: password rotation invalidates all old sessions", async () => {
  const f = fixture();
  const a = await f.api.issueAdminSession();
  const b = await f.api.issueAdminSession();
  f.env.ADMIN_PASSWORD = "new-password";
  assert.equal(await f.api.verifyAdminSession(a), false);
  assert.equal(await f.api.verifyAdminSession(b), false);
  const c = await f.api.issueAdminSession();
  assert.equal(await f.api.verifyAdminSession(c), true);
});

test("WU-03: legacy and malformed cookies are rejected without Redis lookup", async () => {
  const f = fixture();
  for (const token of [undefined, "", "1700000000000." + "a".repeat(64), "not-a-token", "a".repeat(44)]) {
    assert.equal(await f.api.verifyAdminSession(token), false);
  }
  assert.equal(f.calls.length, 0);
});

test("WU-03: missing Redis, outage, malformed responses fail closed", async () => {
  for (const opts of [{ configured: false }, { outage: true }, { malformed: true }]) {
    const f = fixture(opts);
    await assert.rejects(f.api.issueAdminSession());
  }
  const f = fixture();
  const token = await f.api.issueAdminSession();
  f.setOutage(true);
  assert.equal(await f.api.verifyAdminSession(token), false);
  await assert.rejects(f.api.revokeAdminSession(token));
});

test("WU-03: rotation secret is mandatory for issuance and verification", async () => {
  const f = fixture();
  const token = await f.api.issueAdminSession();
  delete f.env.ADMIN_SESSION_ROTATION_SECRET;
  assert.equal(await f.api.verifyAdminSession(token), false);
  await assert.rejects(f.api.issueAdminSession());
});

test("WU-03: malformed stored records fail closed", async () => {
  const f = fixture();
  const token = await f.api.issueAdminSession();
  const key = [...f.entries.keys()][0];
  f.entries.get(key).raw = JSON.stringify({ v: 1, createdAt: 1, expiresAt: 2, rotation: "bad" });
  assert.equal(await f.api.verifyAdminSession(token), false);
});
