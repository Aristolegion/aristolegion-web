import assert from "node:assert/strict";
import { isolatedTarget } from "./wu03-live-target.mjs";

// Invalid status is deliberately rejected before any database write.
export async function verifySession(env = process.env, request = fetch) {
  const target = isolatedTarget(env);
  const password = env.PA01_NONPROD_ADMIN_PASSWORD;
  const bypass = env.PA01_VERCEL_BYPASS_SECRET;
  assert.ok(password && bypass && bypass.length >= 16, "Isolated credentials required");
  const path = "/api/sanctum/applications/00000000-0000-0000-0000-000000000000";
  let cookie;
  let revoked = false;
  async function send(route, method, body, origin = target.origin, session = cookie) {
    const headers = {"content-type":"application/json", origin, "x-vercel-protection-bypass":bypass};
    if (session) headers.cookie = session;
    return request(new URL(route,target), {method, headers, body:JSON.stringify(body), redirect:"manual", signal:AbortSignal.timeout(12000)});
  }
  async function expect(response, status, error) {
    assert.equal(response.status,status);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/i);
    const body = await response.json();
    assert.ok(body && typeof body === "object");
    if (error) assert.ok(body.success === false && body.error === error, "Unexpected application response");
    else assert.ok(body.success === true, "Expected successful application response");
  }
  try {
    const login = await send("/api/sanctum/login","POST",{password});
    await expect(login,200);
    const raw = login.headers.getSetCookie().find(x => x.startsWith("aristolegion_sanctum_session="));
    assert.ok(raw && /;\s*HttpOnly/i.test(raw) && /;\s*Secure/i.test(raw) && /;\s*SameSite=Lax/i.test(raw), "Missing secure session cookie");
    cookie = raw.split(";")[0];
    assert.ok(/^aristolegion_sanctum_session=[A-Za-z0-9_-]{43}$/.test(cookie), "Unexpected session format");
    await expect(await send(path,"PATCH",{status:"PA01_INVALID"}),400,"Invalid status.");
    await expect(await send(path,"PATCH",{status:"PA01_INVALID"},"https://foreign.invalid"),403,"Forbidden origin.");
    await expect(await send(path,"PATCH",{status:"PA01_INVALID"}),400,"Invalid status.");
    await expect(await send("/api/sanctum/logout","POST",{}),200);
    revoked = true;
    await expect(await send(path,"PATCH",{status:"PA01_INVALID"}),401,"Unauthorized.");
    return {verdict:"PASS", checks:["authenticated guard","foreign origin rejected","same origin preserved","logout","revoked cookie rejected"]};
  } finally {
    if (cookie && !revoked) {
      try { await expect(await send("/api/sanctum/logout","POST",{}),200); }
      catch { throw new Error("Cleanup revocation unconfirmed; rotate isolated session secret"); }
    }
  }
}
