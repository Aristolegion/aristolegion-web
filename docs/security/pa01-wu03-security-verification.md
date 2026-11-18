# PA-01 WU-03 | Security verification and release gate

Branch: `security/pa01-wu03-opaque-sessions`. Production merge/promotion: **NOT AUTHORIZED**.

## Implemented
- 256-bit random opaque administrator tokens; Redis stores SHA-256 token digests, not plaintext tokens.
- Redis session keys are separated by `production`, `preview`, and `development`; absolute seven-day expiry is enforced both by Redis `EX 604800` and record timestamps.
- Login persists sessions before issuing HttpOnly, SameSite=Lax, production-Secure cookies. Logout revokes the Redis key before reporting success.
- Password changes invalidate old sessions via a server-side HMAC fingerprint. Redis errors deny access rather than falling back to legacy cookies.
- The 14 protected Sanctum API route files (17 methods), dashboard, and three hosted content pages use asynchronous session validation.
- Sanctum state-changing requests are subject to a same-origin Origin gate in `proxy.ts`.
- Login limiter uses atomic Redis EVAL and environment-specific key prefixes: `pa01:<environment>:login:v1:`. Previously the limiter used a shared `pa01:nonprod:login:v1:` prefix.

## Evidence and test boundaries
- `wu03-session-registry.test.mjs`: opaque token issuance, revocation, absolute expiration, rotation, invalid records, Redis failure (mocked Redis).
- `wu03-phase2-migration.test.mjs`: static inventory and guard assertions for protected routes; does not execute every route.
- `wu03-origin-gate.test.mjs`: Origin guard unit tests; a prior nonproduction foreign-origin request returned 403.
- `wu03-runtime-auth.test.mjs`: executes the real applications PATCH handler against the real session registry in a VM with mocked Next cookies, Redis, and Supabase. Checks missing/legacy/malformed, active/revoked, expired, and Redis-outage sessions. This is an isolated runtime test, **not** an end-to-end deployed API test.
- `wu02-limiter.test.mjs`: rate-limit regression and namespace separation.
- A nonproduction Upstash session key returned TTL 604613 seconds, consistent with the seven-day expiration.
- CI: workflow `.github/workflows/pa01-wu03.yml` runs tests, lint, TypeScript, and build. Confirm the latest commit's CI status before approval.

## Open release requirements
1. Confirm CI passes on the final commit.
2. Perform authenticated cross-origin negative tests and verify trusted Origin handling behind the deployment proxy.
3. Perform an independent security review and nonproduction end-to-end API checks, including Redis outage behavior, before merge.
4. Validate production/preview Redis credential and keyspace isolation. Separate key prefixes prevent key collision but do not substitute for independent credentials and access controls.
5. Review rollback carefully: restoring legacy HMAC validation can re-enable previously copied cookies.

## Secret and deployment safety
Never paste or log administrator passwords, Redis tokens, rotation secrets, or session cookies. Do not rotate global `ADMIN_PASSWORD`, deploy to production, or merge this branch as part of test execution.
