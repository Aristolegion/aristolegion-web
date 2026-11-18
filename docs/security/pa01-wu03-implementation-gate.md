# PA-01 WU-03 | Opaque administrator sessions: implementation gate

Status: **DESIGN / NOT DEPLOYMENT APPROVED**. Branch: `security/pa01-wu03-opaque-sessions`.

## Verified current state (2026-11-18)
- `lib/sanctum/auth.ts` creates a timestamp.HMAC cookie signed with `ADMIN_PASSWORD`; session validation is synchronous and does not consult a server-side registry.
- `app/api/sanctum/login/route.ts` uses the WU-02 Redis admission limiter, but issues the legacy signed cookie.
- `app/api/sanctum/logout/route.ts` only deletes the browser cookie; copied cookies remain usable until expiry.
- `app/sanctum/page.tsx` and protected API routes (including essays and publications) call `isValidSessionToken` synchronously.
- The WU-02 draft PR #39 is explicitly not approved for merge/deployment; its independent review and runtime verification gates must remain open until proven closed.
- The WU-03 branch exists, but its inspected auth/login/logout files still implement legacy sessions.

## Proposed security contract
1. Generate 32 cryptographically random bytes per login, encode as unpadded base64url; never embed identity, timestamps, or password-derived signatures in the cookie.
2. Store only SHA-256(token) as a Redis key suffix, namespaced by environment. Store a minimal session record with creation time, absolute expiry, and a password-rotation generation identifier. Never store plaintext tokens, passwords or credential hashes in logs.
3. Create the session with an atomic Redis write and seven-day bounded TTL. Issue a cookie only after Redis acknowledges successful persistence. Deny new login if Redis is unavailable.
4. Validate all protected page/API requests against Redis; malformed, absent, legacy, expired or revoked tokens are unauthorized. Redis failures must fail closed, never fall back to HMAC validation.
5. Logout deletes the server-side Redis record before reporting successful revocation. On Redis failure, clear the local cookie but return a failure status; do not claim revocation.
6. Password rotation must invalidate all prior sessions. A stable rotation generation must be checked server-side (e.g. HMAC of a server-only rotation secret plus the current password, or a centrally stored epoch). A simple token TTL is insufficient. Document the rotation procedure.
7. Apply HttpOnly, Secure in production, SameSite=Lax (with explicit same-origin mutation protection in a separate security unit), Path=/, seven-day Max-Age; all auth responses no-store.
8. Centralize async session validation so every protected handler and the dashboard use the same verifier. Audit every `isValidSessionToken` call site before switching.
9. Do not merge, promote, probe live login endpoints, or modify production secrets as part of WU-03 without explicit approval.

## Required executable acceptance tests
- Tokens are unique and contain at least 256 bits of CSPRNG entropy; token bytes never appear in Redis keys.
- Redis persistence failure does not issue a cookie; invalid Redis responses fail closed.
- Two workers validate the same active session; expiration rejects it after the absolute seven-day boundary.
- Logout revokes the token and replay fails even with a copied cookie.
- Password rotation rejects all prior tokens, including sessions created on another worker.
- Legacy timestamp.HMAC cookies are rejected everywhere.
- Missing Redis credentials, timeout, network failure and malformed Redis responses deny protected access.
- Every Sanctum mutation and the dashboard are protected by async Redis verification.
- Regression tests, lint, TypeScript and production build pass, with independent review and isolated nonproduction integration evidence.

## Execution order
1. Inventory all authentication consumers and tests, including nested Sanctum routes.
2. Introduce a small, independently testable Redis session registry and its contract tests.
3. Switch login issuance, logout revocation, and all guards atomically in one reviewable change.
4. Add rotation, migration/rejection, concurrency and outage tests.
5. Run CI and independent review; keep the draft PR unmerged until gates close.

## Rollback and migration
Deployment is a deliberate hard cutover: existing legacy cookies are invalidated and admins must log in again. A rollback to legacy signed-cookie code would restore acceptance of old copied cookies, so rollback must be reviewed as a security regression; prefer a corrected forward deployment with server-side revocation preserved.
