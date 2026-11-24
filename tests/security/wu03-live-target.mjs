import assert from "node:assert/strict";

// Exact deployment URL must be independently checked in Vercel as Preview,
// belonging to the isolated failure-lab project, before setting this allowlist.
export function isolatedTarget(env = process.env) {
  assert.equal(env.PA01_CONFIRMATION, "ISOLATED-NONPROD");
  const raw = env.PA01_PREVIEW_URL;
  assert.ok(typeof raw === "string" && raw === env.PA01_APPROVED_PREVIEW_URL, "Exact independently approved preview URL required");
  const target = new URL(raw);
  assert.match(target.hostname, /^aristolegion-wu03-failure-[a-z0-9]{9}-anshumans-projects-1e7e6815\.vercel\.app$/);
  assert.equal(raw, target.origin + "/", "Canonical HTTPS deployment origin with trailing slash required");
  assert.equal(target.protocol, "https:");
  assert.equal(target.port, "");
  assert.equal(target.username, "");
  assert.equal(target.password, "");
  return target;
}
