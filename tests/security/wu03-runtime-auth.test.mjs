import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import crypto from "node:crypto";

const compile = file => ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  let now = 1_700_000_000_000;
  let outage = false;
  let cookie;
  let writes = 0;
  const entries = new Map();
  const env = {
    ADMIN_PASSWORD: "isolated-test-password",
    ADMIN_SESSION_ROTATION_SECRET: "isolated-rotation-secret-at-least-32-chars",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "test-only",
    VERCEL_ENV: "preview",
  };
  const fakeFetch = async (_url, options) => {
    if (outage) throw Error("simulated Redis outage");
    const [op, key, ...args] = JSON.parse(options.body);
    if (op === "SET") {
      assert.deepEqual(args.slice(1), ["EX", 604800, "NX"]);
      entries.set(key, { raw: args[0], expires: now + 604800000 });
      return { ok: true, json: async () => ({ result: "OK" }) };
    }
    if (op === "GET") {
      const entry = entries.get(key);
      return { ok: true, json: async () => ({ result: entry && entry.expires > now ? entry.raw : null }) };
    }
    if (op === "DEL") return { ok: true, json: async () => ({ result: entries.delete(key) ? 1 : 0 }) };
    throw Error("unexpected Redis command");
  };
  const registry = { exports: {} };
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(compile("lib/sanctum/sessionRegistry.ts"), {
    exports: registry.exports, require: id => {
      if (id === "node:crypto") return crypto;
      if (id === "./environment") return { sanctumRedisNamespace: () => {
        if (["production", "preview", "development"].includes(env.VERCEL_ENV)) return env.VERCEL_ENV;
        throw Error("Unrecognized deployment environment");
      } };
      throw Error("unexpected dependency " + id);
    },
    process: { env }, Date: Clock, Buffer, URL, AbortSignal, fetch: fakeFetch,
  });
  const route = { exports: {} };
  vm.runInNewContext(compile("app/api/sanctum/applications/[id]/route.ts"), {
    exports: route.exports,
    require: id => {
      if (id === "next/headers") return { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) };
      if (id === "@/lib/sanctum/auth") return { SANCTUM_SESSION_COOKIE: "aristolegion_sanctum_session" };
      if (id === "@/lib/sanctum/sessionRegistry") return registry.exports;
      if (id === "@/lib/supabase") return { supabaseUpdate: async () => { writes++; return { ok: true }; } };
      throw Error("unexpected dependency " + id);
    },
    Response, console,
  });
  const patch = () => route.exports.PATCH(new Request("https://example.test/api/sanctum/applications/1", {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "accepted" }),
  }), { params: Promise.resolve({ id: "1" }) });
  return {
    issue: () => registry.exports.issueAdminSession(),
    revoke: token => registry.exports.revokeAdminSession(token),
    setCookie: value => { cookie = value; },
    advance: ms => { now += ms; },
    outage: value => { outage = value; },
    patch, getWrites: () => writes,
  };
}

test("WU-03 runtime PATCH denies missing, malformed and legacy cookies without database writes", async () => {
  const f = harness();
  for (const token of [undefined, "invalid", "1700000000000." + "a".repeat(64)]) {
    f.setCookie(token);
    assert.equal((await f.patch()).status, 401);
  }
  assert.equal(f.getWrites(), 0);
});

test("WU-03 runtime PATCH allows active session then denies revoked replay", async () => {
  const f = harness();
  const token = await f.issue();
  f.setCookie(token);
  assert.equal((await f.patch()).status, 200);
  await f.revoke(token);
  assert.equal((await f.patch()).status, 401);
  assert.equal(f.getWrites(), 1);
});

test("WU-03 runtime PATCH denies session at exact seven-day expiry", async () => {
  const f = harness();
  f.setCookie(await f.issue());
  f.advance(604800000 - 1);
  assert.equal((await f.patch()).status, 200);
  f.advance(1);
  assert.equal((await f.patch()).status, 401);
  assert.equal(f.getWrites(), 1);
});

test("WU-03 runtime PATCH fails closed on Redis outage", async () => {
  const f = harness();
  f.setCookie(await f.issue());
  f.outage(true);
  assert.equal((await f.patch()).status, 401);
  assert.equal(f.getWrites(), 0);
});
