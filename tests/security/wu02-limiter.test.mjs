import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import crypto from "node:crypto";
import net from "node:net";

const ROOT = process.cwd();
const source = fs.readFileSync(path.join(ROOT, "lib/sanctum/rateLimit.ts"), "utf8");

function fixture({ configured = true, vercel = "1", address = "203.0.113.9", outage = false } = {}) {
  const counters = new Map();
  const commands = [];
  const env = {
    VERCEL: vercel,
    ...(configured ? { UPSTASH_REDIS_REST_URL: "https://example.upstash.io", UPSTASH_REDIS_REST_TOKEN: "test-only" } : {}),
  };
  const fakeFetch = async (_url, opts) => {
    if (outage) throw new Error("offline");
    const [cmd, ...args] = JSON.parse(opts.body);
    commands.push(cmd);
    if (cmd === "EVAL") {
      const key = args[2];
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      return { ok: true, json: async () => ({ result: [count, 900000] }) };
    }
    if (cmd === "DEL") {
      const deleted = counters.delete(args[0]) ? 1 : 0;
      return { ok: true, json: async () => ({ result: deleted }) };
    }
    throw new Error("unexpected command");
  };
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, {
    exports, require: (id) => ({ "node:crypto": crypto, "node:net": net })[id],
    process: { env }, fetch: fakeFetch, URL, AbortSignal,
  });
  const request = (ip = address) => ({ headers: { get: (name) => name === "x-vercel-forwarded-for" ? ip : null } });
  return { api: exports, request, commands, counters };
}

test("WU-02: five attempts admitted, sixth blocked with Retry-After", async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 6 }, () => f.api.admitLoginAttempt(f.request())));
  assert.equal(results.filter(r => r.allowed).length, 5);
  assert.equal(results.filter(r => !r.allowed).length, 1);
  assert.equal(results.find(r => !r.allowed).retryAfterSeconds, 900);
  assert.ok(f.commands.every(cmd => cmd === "EVAL"));
});

test("WU-02: concurrent admissions never erase another attempt", async () => {
  const f = fixture();
  const first = await f.api.admitLoginAttempt(f.request());
  const second = await f.api.admitLoginAttempt(f.request());
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(f.counters.get(first.key), 2);
  assert.equal(typeof f.api.clearLoginAttempts, "undefined");
  assert.equal(f.commands.includes("DEL"), false);
});

test("WU-02: client identity is hashed and different clients are separated", async () => {
  const f = fixture();
  const a = await f.api.admitLoginAttempt(f.request("203.0.113.9"));
  const b = await f.api.admitLoginAttempt(f.request("203.0.113.10"));
  assert.notEqual(a.key, b.key);
  assert.equal(a.key.includes("203.0.113"), false);
});

test("WU-02: untrusted ingress and invalid client headers fail closed", async () => {
  const f = fixture({ vercel: "0" });
  await assert.rejects(f.api.admitLoginAttempt(f.request()));
  const g = fixture();
  for (const ip of [null, "203.0.113.9, 198.51.100.1", "not-an-ip", " 203.0.113.9"]) {
    await assert.rejects(g.api.admitLoginAttempt(g.request(ip)));
  }
});

test("WU-02: missing Redis config and outages fail closed", async () => {
  const missing = fixture({ configured: false });
  await assert.rejects(missing.api.admitLoginAttempt(missing.request()));
  const down = fixture({ outage: true });
  await assert.rejects(down.api.admitLoginAttempt(down.request()));
});

test("WU-02: Lua performs INCR and PEXPIRE in one atomic EVAL", () => {
  assert.match(source, /redis\.call\('INCR'/);
  assert.match(source, /redis\.call\('PEXPIRE'/);
  assert.match(source, /\["EVAL", ADMIT_SCRIPT/);
  assert.doesNotMatch(source, /new Map</);
});
