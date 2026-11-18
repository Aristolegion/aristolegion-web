import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const compiled = ts.transpileModule(fs.readFileSync("lib/sanctum/environment.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function namespace(env) {
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, process: { env } });
  return module.exports.sanctumRedisNamespace();
}
test("WU-03: known Vercel environments have distinct namespaces", () => {
  for (const name of ["production", "preview", "development"]) {
    assert.equal(namespace({ VERCEL: "1", VERCEL_ENV: name, NODE_ENV: "production" }), name);
  }
});
test("WU-03: production rejects missing or unknown Vercel environment", () => {
  for (const env of [
    { VERCEL: "1", NODE_ENV: "production" },
    { VERCEL: "1", VERCEL_ENV: "staging", NODE_ENV: "production" },
    { NODE_ENV: "production" },
  ]) assert.throws(() => namespace(env), /Unrecognized deployment environment/);
});
test("WU-03: explicit local development remains supported", () => {
  assert.equal(namespace({ NODE_ENV: "test" }), "development");
});
