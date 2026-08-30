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
      bodySizeLimit: '15mb',
    },
  },
};

// Sentry Config
const sentryConfig = {
  org: "factory-qc",
  project: "factory-qc-platform",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring",
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

// Initialize Sentry only if DSN is present
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  config = withSentryConfig(config, sentryConfig);
}

export default config;
