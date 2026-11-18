# PA-01 WU-03 | Opaque Redis Admin Sessions

Status: implementation branch opened; implementation and tests pending.
Branch: `security/pa01-wu03-opaque-sessions`
Production release: NOT AUTHORIZED.

## Verified baseline
- `lib/sanctum/auth.ts` currently signs `issuedAt` using ADMIN_PASSWORD as HMAC key, with seven-day age enforcement.
- `app/api/sanctum/logout/route.ts` only deletes a cookie, so copied tokens are not revoked.
- `app/sanctum/page.tsx` and Sanctum API handlers synchronously call `isValidSessionToken`.
- WU-02 has working branch-scoped Upstash Redis credentials, atomic limiter and fail-closed behavior.

## Implementation requirements
1. Generate at least 256 bits of random token entropy; expose only base64url token in an HttpOnly, Secure, SameSite=Lax, Path=/ cookie. Prefer a `__Host-` cookie name for new sessions.
2. Persist only SHA-256 digest under a distinct namespaced Redis key. Set TTL atomically at creation, maximum seven days; do not persist raw tokens or admin password.
3. Validate token syntax, digest, existence, and TTL through Redis on every privileged read or write; never fall back to legacy HMAC verification or process-local state.
4. Revoke the digest key on logout before clearing cookie; return service-unavailable on Redis failure rather than falsely claiming server-side revocation.
5. Fail closed on malformed, expired, missing, revoked, or Redis-unavailable sessions. Distinguish unauthenticated (401) from infrastructure unavailable (503) for APIs.
6. Migrate all Sanctum routes and dashboard checks together, including nested create/edit/send/test-send/upload endpoints. No partial rollout that retains old token validation.
7. Keep WU-02 limiter before password verification. If Redis session persistence fails after password verification, do not issue cookie.
8. Ensure cookie deletion uses identical name/path; no domain attribute. Use no-store on auth responses. Plan legacy cookie cleanup without accepting legacy sessions.
9. Review CSRF/origin guard as WU-04 dependency. SameSite=Lax alone does not substitute for an explicit origin guard on state-changing requests.
10. Avoid logging raw session tokens, passwords, Redis auth headers, or secret values.

## Acceptance tests
- Correct password creates opaque token and one Redis entry with bounded TTL.
- Wrong password and limiter rejection create no session.
- Token is not self-validating; forged, malformed, expired, and deleted Redis keys deny access.
- Logout revokes server-side and clears cookie; replay after logout is rejected.
- Multiple concurrent sessions are independently revocable.
- Redis timeout/unavailable yields no privileged access and no new cookie.
- All dashboard and Sanctum API guards use the new asynchronous verifier.
- Existing WU-02 tests remain passing.
- CI/build pass on isolated branch; independent security review before production.

## Scope boundary
No changes to production, main application code, or draft PR #39 are authorized by this work unit.
