# PA-01 WU-02 | Preliminary security review (2026-11-11)

**Status: NOT APPROVED.** This is an author-side code review, **not** the required independent review. No production or preview deployment authorized by this document.

## Evidence
- GitHub Actions run 43045539966: legacy auth 4/4, WU-02 mock limiter 6/6, future-state contracts 2/6 (4 intentionally RED), lint 0 errors/2 warnings, TypeScript and build green.
- Source: `lib/sanctum/rateLimit.ts`, `app/api/sanctum/login/route.ts`, `tests/security/wu02-limiter.test.mjs`.
- Preview branch has both Upstash REST environment-variable keys (metadata only), scoped to `security/pa01-foundation`; live connectivity not tested.

## Findings requiring remediation / proof
1. **HIGH: Successful-login reset race.** Admission is atomic, but `clearLoginAttempts` performs a separate unconditional DEL. A legitimate successful request may delete failures added by another concurrent request after admission. Add a conditional, atomic reset tied to the admitted counter generation or redesign success handling; test adversarial interleavings.
2. **HIGH: Ingress trust not proven.** `VERCEL=1` is a runtime flag, not proof that `x-vercel-forwarded-for` cannot be supplied or altered by a client in this deployment. Confirm actual Vercel ingress normalization and test crafted forwarding headers against an isolated, authorized preview before trusting this identity source. Reject multi-value headers and document any proxy/CDN in front.
3. **HIGH: No live Redis validation.** Mock `EVAL` returns a synthetic result; no real Upstash Lua execution, shared-counter test from separate workers, expiration, timeout, rate-limit service quota or connectivity proof exists.
4. **MEDIUM: Limiter semantics changed.** The legacy guard counted failed passwords, but WU-02 counts all requests, including malformed JSON and successful logins until reset. Explicitly approve this tradeoff and test availability/false positives.
5. **MEDIUM: Request-body parsing edge case.** `request.json()` may produce `null`; destructuring `password` from null throws, resulting in HTTP 500. Add strict payload shape validation.
6. **MEDIUM: Environment isolation.** The code uses a hardcoded `pa01:nonprod:` prefix, but no runtime assertion prevents accidental execution with production-targeted Redis credentials. Add explicit deployment-environment and branch restrictions, without exposing secrets.
7. **MEDIUM: Response hardening.** No Cache-Control no-store header on 400/401/500/200 paths; review cache semantics for auth endpoints.
8. **LOW: CI does not exercise deployed network behavior.** Build is green but sitemap logs report absent Supabase credentials. Two lint warnings remain.

## Next test plan
- Add negative tests for malformed JSON, null payload, spoofed headers, malformed Redis results, wrong protocol, response errors and reset failures.
- Add deterministic concurrency test that reproduces the DEL-after-admission race.
- Run atomic Lua against dedicated nonproduction Redis with two independent clients and TTL boundary checks. Do not use production secrets or run against production.
- Verify preview deployment only after explicit authorization; no production promotion.
- Obtain a named, independent GitHub reviewer and require approval before security acceptance.

## Scope
WU-03 sessions, WU-04 origin enforcement, and WU-05 deployment/acceptance are not authorized by this review.
