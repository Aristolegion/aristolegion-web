// Central request-processing layer for Aristolegion (ES-002).
//
// NOTE ON FILENAME: Next.js 16 deprecates the `middleware.ts` file
// convention in favor of `proxy.ts` (the exported function is renamed from
// `middleware` to `proxy`). `middleware.ts` still works in this version but
// is explicitly the legacy path going forward, so this foundation is built
// on the current convention. See:
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
//
// This file stamps every request/response with a request ID (ES-002) and
// applies baseline HTTP security headers (ES-003). Deliberately structured
// so later Engineering Specifications can add each remaining concern as its
// own step in `runProxy` without restructuring this file:
//   - Rate Limiting
//   - Authentication
//   - AI Gateway
//   - Logging
// Content-Security-Policy (ES-004B) deliberately does NOT live here — it is
// nonce-free and delivered as a static header via next.config.ts's
// headers(), which preserves SSG for every route. See next.config.ts for
// the policy and the reasoning for that choice.
// No database access, no auth, no logging — just request ID plumbing and
// security headers.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REQUEST_ID_HEADER = "x-request-id";

// Permissions-Policy: this application does not use any of these browser
// features anywhere in the codebase (verified: no camera/microphone/
// geolocation/payment APIs referenced), so they are disabled for every
// origin, including this one. Kept minimal — only features confirmed
// unused are listed here, per ES-003.
const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=()";

function withRequestId(request: NextRequest): { requestId: string; response: NextResponse } {
  const requestId = crypto.randomUUID();

  // Set on the outgoing request too, so downstream Server Components/Route
  // Handlers can read the same ID via request.headers once future steps are
  // added here (e.g. logging keyed by request ID).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(REQUEST_ID_HEADER, requestId);

  return { requestId, response };
}

// ES-003: baseline HTTP security headers. No CSP, HSTS, COEP, COOP, or CORP
// here — those are explicitly out of scope for this step.
function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  return response;
}

// Future steps (CSP, Rate Limiting, Authentication, AI Gateway, Logging)
// will each read/write `response` here, in order, before the final return —
// this function is the single seam future specs extend.
function runProxy(request: NextRequest): NextResponse {
  const { response } = withRequestId(request);
  return withSecurityHeaders(response);
}

export function proxy(request: NextRequest) {
  return runProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|fonts).*)",
  ],
};
