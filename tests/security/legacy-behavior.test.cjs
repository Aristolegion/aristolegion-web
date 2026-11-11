// WU-01 behavioral characterization of the CURRENT implementation.
// Run from repository root: node --test tests/security/legacy-behavior.test.cjs
// Uses TypeScript's transpiler and isolated VM contexts; no live credentials/network.
// Passing characterization tests do NOT satisfy PA-01 future-state acceptance.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "../..");
function loadModule(file, { now = 1_700_000_000_000, password = "test-only-password" } = {}) {
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, "TypeScript transpilation errors");
  const exports = {};
  const clock = class extends Date { static now() { return nowRef.value; } };
  const nowRef = { value: now };
  const sandbox = {
    exports,
    require: (name) => {
      if (name === "node:crypto") return crypto;
      throw new Error("Unexpected dependency in security fixture: " + name);
    },
    process: { env: { ADMIN_PASSWORD: password } },
    Date: clock,
    Buffer,
  };
  vm.runInNewContext(output.outputText, sandbox, { filename: file, timeout: 1000 });
  return { api: exports, advance(ms) { nowRef.value += ms; }, setPassword(value) { sandbox.process.env.ADMIN_PASSWORD = value; } };
}

test("legacy auth: valid founder password accepted, incorrect password rejected", () => {
  const { api } = loadModule("lib/sanctum/auth.ts");
  assert.equal(api.verifyAdminPassword("test-only-password"), true);
  assert.equal(api.verifyAdminPassword("incorrect"), false);
});

test("legacy auth: signed session validates, tampering is rejected", () => {
  const { api } = loadModule("lib/sanctum/auth.ts");
  const token = api.createSessionToken();
  assert.equal(api.isValidSessionToken(token), true);
  assert.equal(api.isValidSessionToken(token + "tampered"), false);
  assert.equal(api.isValidSessionToken("invalid"), false);
});

test("legacy auth: session expires after seven days", () => {
  const fixture = loadModule("lib/sanctum/auth.ts");
  const token = fixture.api.createSessionToken();
  fixture.advance(fixture.api.SESSION_MAX_AGE_SECONDS * 1000 + 1);
  assert.equal(fixture.api.isValidSessionToken(token), false);
});

test("legacy auth: password rotation invalidates old signed sessions", () => {
  const fixture = loadModule("lib/sanctum/auth.ts");
  const token = fixture.api.createSessionToken();
  fixture.setPassword("rotated-test-only-password");
  assert.equal(fixture.api.isValidSessionToken(token), false);
});

test("legacy limiter: fifth failed attempt blocks; window expires", () => {
  const fixture = loadModule("lib/sanctum/rateLimit.ts");
  for (let i = 0; i < 4; i++) fixture.api.recordFailure("test-ip");
  assert.equal(fixture.api.isBlocked("test-ip"), false);
  fixture.api.recordFailure("test-ip");
  assert.equal(fixture.api.isBlocked("test-ip"), true);
  assert.ok(fixture.api.getRetryAfterSeconds("test-ip") > 0);
  fixture.advance(15 * 60 * 1000 + 1);
  assert.equal(fixture.api.isBlocked("test-ip"), false);
});

test("legacy limiter: process instances do not share failure state (known weakness)", () => {
  const a = loadModule("lib/sanctum/rateLimit.ts");
  const b = loadModule("lib/sanctum/rateLimit.ts");
  for (let i = 0; i < 5; i++) a.api.recordFailure("same-ip");
  assert.equal(a.api.isBlocked("same-ip"), true);
  assert.equal(b.api.isBlocked("same-ip"), false);
});
