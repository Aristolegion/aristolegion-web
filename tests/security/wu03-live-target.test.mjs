import { test } from "node:test";
import assert from "node:assert/strict";
import { isolatedTarget } from "./wu03-live-target.mjs";
const valid = "https://aristolegion-wu03-failure-7ea0b3vm7-anshumans-projects-1e7e6815.vercel.app/";
const env = { PA01_CONFIRMATION: "ISOLATED-NONPROD", PA01_PREVIEW_URL: valid, PA01_APPROVED_PREVIEW_URL: valid };
test("accepts explicitly approved isolated deployment", () => assert.equal(isolatedTarget(env).href, valid));
test("rejects unsafe targets even when allowlisted", () => {
  for (const url of ["https://aristolegion-web.vercel.app/", "https://aristolegion.com/", valid.replace("https:", "http:"), valid + "api", valid + "?x=1", valid.replace(".vercel.app", ".vercel.app.example.com"), valid.replace("https://", "https://user@"), valid.replace(".app/", ".app:8443/")]) {
    assert.throws(() => isolatedTarget({...env, PA01_PREVIEW_URL:url, PA01_APPROVED_PREVIEW_URL:url}));
  }
});
test("requires explicit matching approval", () => {
  assert.throws(() => isolatedTarget({...env, PA01_APPROVED_PREVIEW_URL:undefined}));
  assert.throws(() => isolatedTarget({...env, PA01_CONFIRMATION:""}));
});
