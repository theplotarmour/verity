# Dependency and Supply-Chain Audit

## Dependency state

| Item | Manifest/lock | Working install | Clean detached install | Assessment |
|---|---|---|---|---|
| Next.js | 16.3.3 | 16.2.10, invalid tree | 16.3.3 | committed intent patched; current runtime unsafe/stale |
| eslint-config-next | 16.3.3 | 16.2.10, invalid | 16.3.3 | local drift |
| Vitest | 4.1.10 | 4.1.10 | 4.1.10 | moderate advisory open |
| Prisma | range `^6.12`; lock/client 6.19.3 | 6.19.3 | 6.19.3 | valid, but package.json Prisma config deprecation warning |

`npm audit --json` found two moderate vulnerabilities and no high/critical vulnerabilities in the committed dependency tree: direct `vitest` and transitive `@vitest/mocker`, fixed in 4.1.11.

## Critical Next.js context

The clean artifact installs 16.3.3, which is the patched August 2026 line. The working application and local production probe ran 16.2.10. Official advisories state:

- AVIF image optimization unauthenticated RCE affects versions before 16.3.3.
- Server Function endpoint source disclosure affects versions before 16.2.11.
- A separate Windows RCE applies to 16.x before 16.3.3 when both Pages and App routers are used; this repository exposes only App Router routes, so that precondition was not demonstrated.

The AVIF path remains relevant because Next's optimizer is public and `remotePatterns` accepts public storage on any `*.supabase.co` hostname. Application upload code rejecting AVIF does not constrain an attacker-controlled remote Supabase project. Do not expose the 16.2.10 runtime.

Sources: [Next.js August 2026 release](https://nextjs.org/blog/august-2026-security-release), [AVIF RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [Server Function disclosure](https://github.com/vercel/next.js/security/advisories/GHSA-955p-x3mx-jcvp), [Windows router RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).

## Build reproducibility

- Working `npm ls --depth=0` returns `ELSPROBLEMS` because installed Next/eslint versions do not match package/lock state and many packages are extraneous.
- A detached archive of HEAD, `npm ci`, exact version check, and build succeeded with Next 16.3.3.
- Therefore the source/lock artifact is buildable, but “the audited working runtime equals the release artifact” is false.
- CI cannot currently establish reproducibility because its YAML does not parse.

## Container/artifact supply chain

| Control | Status |
|---|---|
| Lockfile install | Dockerfile uses `npm ci`; good |
| Base image digest pin | absent (`node:20-bookworm-slim`) |
| PostgreSQL image digest pin | absent (`postgres:16-alpine`) |
| MinIO immutable tag/digest | absent; uses `latest` |
| SBOM | not found |
| Image signature/attestation | not found |
| Vulnerability scan gate | not found |
| Dependabot/Renovate policy | not found in audited files |
| Provenance-bound release artifact | not found |

## Retest gate

CI must start from a clean checkout, use `npm ci`, print exact critical versions, run audit with an explicit severity policy, generate Prisma, typecheck/lint/test/build, build the container by digest-pinned bases, scan it, and publish an immutable digest/SBOM/provenance record.

