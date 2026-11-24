import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync("proxy.ts", "utf8");
const start = source.indexOf("function rejectCrossOriginSanctumMutation(");
const end = source.indexOf("\nfunction runProxy(", start);
assert.ok(start >= 0 && end > start, "Origin guard must exist in proxy");
const snippet = source.slice(start, end) + "\nexports.guard = rejectCrossOriginSanctumMutation;";
const compiled = ts.transpileModule(snippet, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = {
  exports: {},
  URL,
  process: { env: { NODE_ENV: "production" } },
  NextResponse: { json: (body, init) => ({ body, status: init.status, headers: init.headers }) },
};
vm.runInNewContext(compiled, sandbox);
const guard = sandbox.exports.guard;
function request(path, method, origin, target = "https://aristolegion.example") {
  return { nextUrl: new URL(path, target), method, headers: { get: () => origin } };
}

test("same-origin HTTPS Sanctum mutations are accepted", () => {
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    assert.equal(guard(request("/api/sanctum/essays", method, "https://aristolegion.example")), null);
  }
});

test("cross-origin and malformed origins are forbidden", () => {
  for (const origin of ["https://evil.example", "https://aristolegion.example.evil.example", "null", null, "garbage", "http://aristolegion.example", "https://aristolegion.example:444"]) {
    assert.equal(guard(request("/api/sanctum/essays", "POST", origin))?.status, 403);
  }
});

test("login and logout are also protected against cross-origin requests", () => {
  for (const path of ["/api/sanctum/login", "/api/sanctum/logout"]) {
    assert.equal(guard(request(path, "POST", "https://evil.example"))?.status, 403);
  }
});

test("safe methods and unrelated APIs are not blocked", () => {
  assert.equal(guard(request("/api/sanctum/essays", "GET", null)), null);
  assert.equal(guard(request("/api/advisor", "POST", null)), null);
});

test("proxy actually invokes the origin guard", () => {
  assert.match(source, /const rejected = rejectCrossOriginSanctumMutation\(request\)/);
  assert.match(source, /if \(rejected\)/);
});
