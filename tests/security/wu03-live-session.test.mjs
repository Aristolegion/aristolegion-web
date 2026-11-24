import {test} from "node:test";
import assert from "node:assert/strict";
import {verifySession} from "./wu03-live-session.mjs";
const url="https://aristolegion-wu03-failure-7ea0b3vm7-anshumans-projects-1e7e6815.vercel.app/";
const env={PA01_CONFIRMATION:"ISOLATED-NONPROD",PA01_PREVIEW_URL:url,PA01_APPROVED_PREVIEW_URL:url,PA01_NONPROD_ADMIN_PASSWORD:"dummy",PA01_VERCEL_BYPASS_SECRET:"dummy-test-bypass-value"};
test("session harness checks origin and replay without writing data",async()=>{
 const seen=[];
 const request=async (url,options)=>{
  seen.push({path:url.pathname, ...options});
  const n=seen.length;
  const statuses=[200,400,403,400,200,401];
  const errors=[null,"Invalid status.","Forbidden origin.","Invalid status.",null,"Unauthorized."];
  const headers={"content-type":"application/json"};
  if(n===1) headers["set-cookie"]="aristolegion_sanctum_session="+"a".repeat(43)+"; HttpOnly; Secure; SameSite=Lax";
  return new Response(JSON.stringify(errors[n-1]?{success:false,error:errors[n-1]}:{success:true}),{status:statuses[n-1],headers});
 };
 assert.equal((await verifySession(env,request)).verdict,"PASS");
 assert.equal(seen.length,6);
 assert.equal(seen[2].headers.origin,"https://foreign.invalid");
 assert.equal(seen[5].headers.cookie,seen[1].headers.cookie);
 assert.ok(seen.filter(x=>x.method==="PATCH").every(x=>JSON.parse(x.body).status==="PA01_INVALID"));
});
test("unsafe target fails before network",async()=>{
 await assert.rejects(verifySession({...env,PA01_PREVIEW_URL:"https://aristolegion-web.vercel.app/"},()=>{throw Error("network must not run")}), /approved preview/);
});
