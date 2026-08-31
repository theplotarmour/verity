import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {},
  // Task 30 (containerized runtime): a standalone server.js plus a traced,
  // minimal node_modules subset — the officially documented shape for
  // running Next.js outside Vercel without copying the full node_modules
  // tree into the runtime image.
  output: 'standalone',
  // Prisma's generated client ships a native query-engine binary that Next's
  // dependency tracer does not always follow (it is loaded dynamically, not
  // `require()`d statically) — without this, `.next/standalone` builds but
  // throws "Cannot find module '.prisma/client/...'" at runtime. This is the
  // documented fix, not a workaround specific to this repo.
  outputFileTracingIncludes: {
    '*': ['node_modules/.prisma/client/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      // Audit finding F-02. Was 15mb, against a 1mb default, and the limit
      // applies to EVERY server action — including the unauthenticated
      // sign-in, which meant an anonymous caller could make the server buffer
      // 15 MB per request. Combined with the absence of any rate limit (F-01)
      // that was a cheap memory-pressure vector.
      //
      // Nothing needs 15 MB. File uploads never transit this application:
      // `files.ts` issues a presigned URL and the client uploads directly to
      // storage. The largest legitimate action payload is the GSTR-2B import,
      // which is capped at 5,000 rows of roughly 120 characters — under 1 MB of
      // JSON, with headroom.
      //
      // 2 MB rather than the 1 MB default: that headroom is deliberate, so a
      // large-but-legitimate import fails on its own row cap with a message an
      // accountant can act on, rather than on a transport limit that reports
      // nothing useful.
      bodySizeLimit: '2mb',
    },
  },

  /**
   * Security response headers — audit finding F-03.
   *
   * The application previously sent none beyond `poweredByHeader: false`.
   *
   * NO CSP HERE, DELIBERATELY. A Content-Security-Policy that Next.js can
   * actually run needs a per-request nonce for its inline bootstrap scripts,
   * which means middleware and a matching `nonce` on every script — a change
   * with real breakage risk that must not be made blind during a remediation
   * pass. A `report-only` CSP would be theatre: it protects nothing and creates
   * a report sink nobody is reading. CSP is its own task, listed in
   * taskplans/66 and left open in the ledger rather than half-done here.
   *
   * These four are the ones that are correct unconditionally and cannot break a
   * working page.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // The app renders no other origin's content and is never framed by
          // one, so deny outright rather than SAMEORIGIN.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops a browser second-guessing a declared content type — the
          // mechanism behind a stored file being executed as script.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // A tenant id or record id in a path must not leak to a third party
          // through the Referer header on an outbound link.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Two years, subdomains included. Not `preload` — that is a one-way
          // submission to a browser-vendor list and is the deployment's call to
          // make, not this file's.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

// Sentry Config
const sentryConfig = {
  // Audit finding F-05. These were `factory-qc` / `factory-qc-platform` —
  // legacy VEDA identifiers, which CLAUDE.md forbids in the active tree, and
  // which meant Verity's production errors were delivered into a different
  // product's Sentry organisation. That is a data-governance problem
  // independent of the scrubbing one in F-04.
  //
  // Environment-driven rather than hard-coded: which Sentry organisation a
  // deployment reports into is a deployment fact, not a source-code fact, and
  // hard-coding one is how the wrong one survived this long.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  // Audit finding F-06. `tunnelRoute` creates an unauthenticated POST endpoint
  // at build time that forwards request bodies to Sentry's ingest. It exists in
  // no route.ts, so a route inventory taken from the filesystem misses it — it
  // is recorded in taskplans/46A for exactly that reason.
  //
  // Its only purpose is to evade ad blockers. That is not a trade an enterprise
  // deployment should make silently, so it is now opt-in: a deployment that
  // wants it sets SENTRY_TUNNEL_ROUTE and accepts the endpoint.
  ...(process.env.SENTRY_TUNNEL_ROUTE ? { tunnelRoute: process.env.SENTRY_TUNNEL_ROUTE } : {}),
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

// The service worker is served by src/app/sw.js/route.ts, not generated here.
// @serwist/next is a webpack plugin and silently no-ops under Turbopack, which
// is what `next build` uses — so it never actually ran, and the stale
// public/sw.js committed alongside it was what production served. Serving the
// worker from a route makes it work under Turbopack and lets the cache name
// carry a real per-deploy id.
let config = nextConfig;

// Only with a DSN, and only with an organisation and project to report into.
// Without the latter two the build would upload source maps nowhere and the
// wrong-project failure of F-05 could recur silently.
if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  config = withSentryConfig(config, sentryConfig);
}

export default config;
