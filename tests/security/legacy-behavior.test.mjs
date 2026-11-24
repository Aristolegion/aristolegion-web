// WU-01 behavioral characterization of the CURRENT implementation.
// Run from repository root: node --test tests/security/legacy-behavior.test.mjs
// Uses TypeScript's transpiler and isolated VM contexts; no live credentials/network.
// Passing characterization tests do NOT satisfy PA-01 future-state acceptance.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vm from "node:vm";
import ts from "typescript";
import * as crypto from "node:crypto";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
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

