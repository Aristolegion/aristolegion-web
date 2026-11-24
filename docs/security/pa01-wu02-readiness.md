# PA-01 WU-02: Distributed login limiter | implementation gate

Status: **BLOCKED FOR RUNTIME INTEGRATION**. This document authorizes no deployment, Redis provisioning, or credential creation.

## Verified baseline (2026-11-11)
- Sanctum login reads the first `x-forwarded-for` value directly. This is not a validated client identity.
- `lib/sanctum/rateLimit.ts` uses a module-local Map with five failures and a 15-minute lockout. Instances do not share state.
- GitHub Actions WU-01 baseline: six legacy behavior tests pass; five future-state checks intentionally fail; lint and TypeScript pass; build completes without Supabase credentials.
- Vercel `aristolegion-web` environment variable metadata shows no `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` or equivalent Redis credentials (values were not decrypted).
- Independent security reviewer identity and GitHub account are not confirmed.

## Preconditions before runtime integration
1. Confirm a **dedicated nonproduction** Redis database (not production or shared production keys), endpoint, ownership, and permission to use it for tests.
2. Confirm credential naming and preview-only scoping; never commit credentials or expose them via `NEXT_PUBLIC_`.
3. Name an independent security reviewer with GitHub review access; reviewer must not be the sole author.
4. Confirm the trusted client-address source on the deployed Vercel ingress. Never blindly trust arbitrary `x-forwarded-for` from clients.
5. Confirm the desired denial behavior when Redis is missing/unreachable. Default: fail closed for *new logins*, without changing established-session validation in WU-02.

## Proposed acceptance tests (must be executable, not regex-only)
- Atomic threshold: simultaneous failures across separate workers share one Redis key and cannot bypass the limit.
- Clock and expiry: the 15-minute window, lockout and Retry-After values are deterministic, bounded and nonnegative.
- Successful login clears the relevant failure state only after a valid password and successful token issuance.
- Spoofed or missing client-address headers cannot generate unlimited independent identities; verify against trusted ingress behavior.
- Redis missing, invalid credentials, timeouts and outages deny new logins without leaking secrets; no fallback to process-local memory.
- Password comparison and existing cookie semantics are unchanged within WU-02.
- Keys are namespace-isolated for nonproduction, with bounded TTL and no raw password or token material.
- Unit, integration and concurrency checks run in CI; nonproduction end-to-end smoke tests require separate authorization.

## Implementation order after preconditions
1. Add an adapter with injected Redis client and deterministic atomic command, using a pinned dependency and committed lockfile.
2. Replace the process-local limiter with shared, bounded-TTL counters.
3. Resolve client identity only from validated platform ingress metadata; document deployment assumptions.
4. Integrate async limiter in login and enforce fail-closed behavior.
5. Run tests, lint, typecheck and build; request independent review before any preview deployment.

## Scope boundary
WU-02 does **not** replace signed sessions, add the Redis session registry, change logout revocation, or add global origin enforcement. Those belong to later work units.
