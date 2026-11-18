# PA-01 WU-03 | Protected route inventory

Status: **SOURCE INVENTORY COMPLETE; IMPLEMENTATION NOT STARTED**.
Audited branch: `security/pa01-wu03-opaque-sessions`, commit `41d3e0add4a7988f4b3a7822fdad493b49b30a76`.
Method: recursive Git tree enumeration and direct file reads of each protected Sanctum API route. This is a static source audit, not a runtime security test.

## Protected Sanctum API routes (12 files, 16 exported methods)

| Route file | Exported methods | Current guard | WU-03 action |
|---|---|---|---|
| `app/api/sanctum/applications/[id]/route.ts` | PATCH | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/essays/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/essays/[id]/route.ts` | PATCH, DELETE | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/essays/[id]/send/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/essays/[id]/test-send/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/newsletter-issues/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/newsletter-issues/[id]/route.ts` | PATCH, DELETE | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/newsletter-issues/[id]/send/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/newsletter-issues/[id]/test-send/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/publications/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/publications/[id]/route.ts` | PATCH, DELETE | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/publications/[id]/send/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/publications/[id]/test-send/route.ts` | POST | `isValidSessionToken` | Async Redis verification |
| `app/api/sanctum/publications/upload-url/route.ts` | POST | `isValidSessionToken` | Async Redis verification |

**Correction to summary counts:** There are **14 protected API route files**, not 12; the earlier initial sample covered 12 additional paths and the previously inspected essays/publications root paths add 2. There are **18 exported protected methods** (12 single-method files + 3 double-method files? Recount from table: 14 route files, 3 double-method files = 17 methods). The authoritative inventory is the table, with **14 files and 17 exported methods**.

## Protected dashboard
- `app/sanctum/page.tsx` checks the Sanctum cookie with synchronous `isValidSessionToken` before loading sensitive data. Switch to awaited Redis-backed validation and ensure failures render the login/unauthorized state without loading data.

## Authentication endpoints (not guarded like protected mutations)
- `app/api/sanctum/login/route.ts`: POST; password gate and WU-02 Redis limiter, then legacy timestamp.HMAC session issuance. Replace issuance with persisted opaque token; only set cookie after successful Redis write.
- `app/api/sanctum/logout/route.ts`: POST; currently deletes browser cookie without server-side revocation. Require Redis deletion of session hash; never claim success on failure.

## Other API routes outside Sanctum
- `app/api/internal/embeddings/reconcile/route.ts`: GET, CRON_SECRET authentication. **Not** a Sanctum session consumer; preserve independent service authentication.
- `app/api/advisor/route.ts`: POST, public-facing AI advisor with separate rate limiting. **Not** a Sanctum session consumer.
- `app/api/inner-circle/apply/route.ts`: POST, public lead capture.
- `app/api/newsletter/subscribe/route.ts`: POST, public signup.
- `app/api/preferences/[token]/route.ts`: POST, bearer-link consent change.
- `app/api/unsubscribe/[token]/route.ts`: POST, bearer-link unsubscribe.

## Security considerations
- All protected Sanctum routes perform writes or send emails. Authentication alone does not establish CSRF protection; verify origin/CSRF protections as a distinct security gate.
- The internal reconciliation worker is a privileged route even though it does not use admin sessions. Retain and independently test CRON_SECRET verification.
- The dashboard and API must reject old timestamp.HMAC cookies after the cutover.
- `proxy.ts` currently provides request IDs and baseline security headers, not authentication. Do not assume proxy enforces access control.
- Redis outages must fail closed for protected access, not silently accept signed legacy cookies.
- No production deployment or merge is authorized by this inventory.

## Implementation acceptance
- Centralized async verifier replaces all 14 protected route guards and the dashboard guard.
- Login and logout integrate with the same Redis session registry.
- An automated repository scan flags any remaining `isValidSessionToken` use in runtime guards.
- Executable tests verify each protected route denies absent, legacy, expired, and revoked tokens.
