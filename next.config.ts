import type { NextConfig } from "next";

// Content-Security-Policy (ES-004B), Report-Only. Delivered here rather than
// proxy.ts deliberately: this policy uses no nonce, and Next.js's own CSP
// guide (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md,
// "Without Nonces") recommends next.config's headers() for exactly this
// case, since a nonce is what forces per-request (dynamic) rendering — a
// static, global header has no such cost and preserves SSG for every route
// exactly as it is today. See ES-004A / RFC-001 for the full origin
// inventory and reasoning behind each directive below; do not add origins
// here without updating those documents.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://sxfetfdgjvfftbydrxfq.supabase.co",
  "font-src 'self'",
  "connect-src 'self' https://sxfetfdgjvfftbydrxfq.supabase.co",
  "object-src 'none'",
  "frame-src 'none'",
  "media-src 'none'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // ES-005: stop advertising the framework in every response (pure
  // information-disclosure reduction, zero functional effect — confirmed via
  // `X-Powered-By: Next.js` present on every response since ES-002).
  poweredByHeader: false,

  // ES-005: strip console.log/warn/info/debug from the production build.
  // console.error is explicitly excluded because the overwhelming majority
  // of console usage in this codebase is legitimate server-side operational
  // error logging (Route Handlers, Server Components) that Vercel captures
  // in function logs — only the three `console.log` calls in
  // components/inner-circle/ApplicationForm.tsx (client-side debug
  // leftovers, visible to any visitor's devtools) are actually removed by
  // this in production. Does not affect `next dev`.
  compiler: {
    removeConsole: { exclude: ["error"] },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: CONTENT_SECURITY_POLICY,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
