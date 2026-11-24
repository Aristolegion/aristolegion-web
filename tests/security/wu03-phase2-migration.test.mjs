import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sanctumRoot = path.join(root, "app/api/sanctum");
const protectedRoutes = [
  "applications/[id]/route.ts",
  "essays/route.ts",
  "essays/[id]/route.ts",
  "essays/[id]/send/route.ts",
  "essays/[id]/test-send/route.ts",
  "newsletter-issues/route.ts",
  "newsletter-issues/[id]/route.ts",
  "newsletter-issues/[id]/send/route.ts",
  "newsletter-issues/[id]/test-send/route.ts",
  "publications/route.ts",
  "publications/[id]/route.ts",
  "publications/[id]/send/route.ts",
  "publications/[id]/test-send/route.ts",
  "publications/upload-url/route.ts",
];

function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

test("WU-03 Phase 2: every protected Sanctum API handler awaits Redis verification", () => {
  for (const relative of protectedRoutes) {
    const source = read("app/api/sanctum/" + relative);
    const methodCount = [...source.matchAll(/export async function (POST|PATCH|PUT|DELETE|GET)\b/g)].length;
    const guards = [...source.matchAll(/await verifyAdminSession\(token\)/g)].length;
    assert.ok(methodCount > 0, "missing handler: " + relative);
    assert.equal(guards, methodCount, "every method must verify Redis: " + relative);
    assert.doesNotMatch(source, /isValidSessionToken|createSessionToken/);
  }
});

test("WU-03 Phase 2: all Sanctum route files are accounted for", () => {
  function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(full) : entry.name === "route.ts" ? [path.relative(sanctumRoot, full).split(path.sep).join("/")] : [];
    });
  }
  const actual = walk(sanctumRoot).sort();
  const expected = [...protectedRoutes, "login/route.ts", "logout/route.ts"].sort();
  assert.deepEqual(actual, expected, "new Sanctum routes require explicit inventory and authentication review");
});

test("WU-03 Phase 2: dashboard awaits Redis guard before sensitive data access", () => {
  const source = read("app/sanctum/page.tsx");
  assert.match(source, /if \(!await verifyAdminSession\(token\)\)/);
  assert.ok(source.indexOf("await verifyAdminSession(token)") < source.indexOf("supabaseSelect<"));
});

test("WU-03 Phase 2: login only issues cookie after persisted Redis session", () => {
  const source = read("app/api/sanctum/login/route.ts");
  assert.match(source, /token = await issueAdminSession\(\)/);
  assert.ok(source.indexOf("token = await issueAdminSession()") < source.indexOf("cookieStore.set("));
  assert.match(source, /status: 503/);
  assert.doesNotMatch(source, /createSessionToken/);
});

test("WU-03 Phase 2: logout revokes in Redis and reports failures", () => {
  const source = read("app/api/sanctum/logout/route.ts");
  assert.match(source, /await revokeAdminSession\(token\)/);
  assert.match(source, /status: 503/);
  assert.ok(source.indexOf("await revokeAdminSession(token)") < source.indexOf("return Response.json({ success: true }"));
});

test("WU-03 Phase 2: legacy signed-token helpers are absent", () => {
  const source = read("lib/sanctum/auth.ts");
  assert.doesNotMatch(source, /export function (createSessionToken|isValidSessionToken)\(/);
});
