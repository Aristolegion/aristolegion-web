// Central request-processing layer for Aristolegion (ES-002).
//
// NOTE ON FILENAME: Next.js 16 deprecates the `middleware.ts` file
// convention in favor of `proxy.ts` (the exported function is renamed from
// `middleware` to `proxy`). `middleware.ts` still works in this version but
// is explicitly the legacy path going forward, so this foundation is built
// on the current convention. See:
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
//
// Today this file only stamps every request/response with a request ID.
// Deliberately structured so later Engineering Specifications can add each
// concern as its own step in `runProxy` without restructuring this file:
//   - Security Headers
//   - CSP
//   - Rate Limiting
//   - Authentication
//   - AI Gateway
//   - Logging
// None of those are implemented here. No database access, no auth, no
// logging — just the request ID plumbing.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REQUEST_ID_HEADER = "x-request-id";

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

// Future steps (Security Headers, CSP, Rate Limiting, Authentication, AI
// Gateway, Logging) will each read/write `response` here, in order, before
// the final return — this function is the single seam future specs extend.
function runProxy(request: NextRequest): NextResponse {
  const { response } = withRequestId(request);
  return response;
}

export function proxy(request: NextRequest) {
  return runProxy(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|fonts).*)",
  ],
};
