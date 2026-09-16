# Complete Verity Audit — Executive Verdict

Audit date: 2026-09-16

Snapshot: `main` at `2a71102e3489231227613d1b5c1115f82c55fec3`

Mode: assessment only; no production code, dependency, schema, deployment, or canonical-document changes

## Decision

**Overall enterprise verdict: NOT READY FOR ENTERPRISE DEPLOYMENT.**

| Decision plane | Verdict | Why the higher verdict is blocked |
|---|---|---|
| Security | **NOT READY** | The live RLS foundation is strong, but the enterprise web container receives the PostgreSQL superuser URL; the audited workspace runs a critically vulnerable Next.js version; and module suspension is not enforced on direct page reads. |
| Modular completion | **NOT A COMPLETE MODULAR PLATFORM** | A working capability catalog and activation substrate exist, but packs, capability upgrade/migration lifecycle, extension packaging, dashboard contribution contracts, and several configuration/template layers do not. Every shipped capability also lacks the full current implementation-contract proof bundle. |
| Single-host Linux, Supabase auth/storage | **NOT READY** | No local scheduler, unsafe runtime `DIRECT_URL`, contradictory restore automation, and no green release gate. |
| Single-host Linux, customer OIDC + MinIO/S3 | **NOT READY** | OIDC token verification exists, but no browser authorization-code/PKCE flow creates the OIDC session; staff provisioning/password operations remain Supabase-specific. The common deployment blockers also apply. |
| Air-gapped / fully offline appliance | **PROFILE NOT SUPPORTED** | No bundled identity provider, no complete offline identity bootstrap, and no proven disconnected install/upgrade/update channel. |
| HA / orchestrated on-prem | **PROFILE NOT SUPPORTED** | The repository supplies single-host Compose, not an HA topology, orchestrator manifests, rolling migration strategy, or multi-replica operational proof. |

## What is genuinely strong

- Live, read-only catalog proof showed the application connects as `verity_app`, with `rolsuper=false` and `rolbypassrls=false`.
- All 139 application tables have RLS and FORCE RLS; 170 policies cover all 139. `_prisma_migrations` is the sole non-RLS table and the runtime role has no grant on it.
- The command/query paths validate input, enforce authorization, rate-limit, establish tenant context in one transaction, and enforce active capability ownership where those paths are used.
- Authentication derives the tenant from a re-verified membership, not request parameters. Session cookies are signed, HTTP-only, SameSite Lax, and Secure in production.
- File upload is two-phase, tenant-prefixed, size-limited, magic-byte checked, and sealed to a fresh key after verification.
- A clean detached `npm ci` installed Next.js 16.3.3 and produced a successful production build. The committed dependency intent is therefore patched even though the working install is stale.
- The local production runtime rendered the sign-in page without browser errors; unauthenticated protected routes redirected or denied, `/api/health` and `/api/ready` returned 200, and metrics/scheduler endpoints returned 401 without their secret.

## Release blockers

1. **VCA-001:** GitHub's `verify` workflow is invalid YAML due duplicate environment keys. The current commit's checks do not start.
2. **VCA-002:** The enterprise web service receives `DIRECT_URL` containing the PostgreSQL superuser credentials. An application compromise becomes a database/RLS bypass.
3. **VCA-003:** The advertised OIDC deployment path has no browser login/callback/PKCE implementation and cannot replace Supabase for interactive users.
4. **VCA-004:** Restore automation ignores `pg_restore` errors and can report completion after a partially failed restore.
5. **VCA-005:** On-prem Compose has no scheduler, so frequent/hourly/daily/weekly capability work does not run by default.
6. **VCA-006:** Capability activation is enforced in command/query execution but not uniformly in direct Server Component reads; suspended modules can remain reachable by URL.
7. **VCA-007–009:** Packs, versioned upgrades, extensions, dashboard composition, and parts of tenant configuration are specifications, not a completed modular runtime.
8. **VCA-010:** Full database and browser acceptance could not be executed safely because only a shared remote database is configured and Docker is absent.
9. **VCA-011:** The current working installation is Next.js 16.2.10 even though package and lock files require 16.3.3; 16.2.10 is affected by published critical advisories.

## Numbers at this snapshot

- 21 canonical findings: 0 P0, 11 P1, 8 P2, 2 P3, 0 P4.
- 76 application page/layout/route source files; 5 API routes.
- 20 registered capabilities.
- 140 public tables, of which 139 are application tables protected by RLS + FORCE RLS.
- 91 migration directories.
- 72 Vitest files and 5 Playwright specifications.
- `npm audit`: 2 moderate vulnerabilities, 0 high, 0 critical in the committed clean tree.
- Safe pure-test slice: 117 passed, 1 failed.
- Full normal suite: refused before collection because `DATABASE_URL` is remote; no shared data was mutated.

## Required sequence before any production approval

1. Remove `DIRECT_URL` from the web service and prove migrations use a separately invoked tools identity.
2. Repair and run CI on an isolated database; close all test failures and require it as a branch/release gate.
3. Reinstall the working tree from lock state and prove the deployed artifact reports Next.js 16.3.3 or later.
4. Implement/prove the chosen on-prem identity path, local scheduler, and fail-closed restore procedure.
5. Add route-level active-capability enforcement and adversarial suspension tests.
6. Decide whether the product claim is “controlled client solutions” or a complete modular platform. For the latter, implement the pack, version/upgrade, extension, dashboard, and template/configuration contracts and certify each capability against the full implementation contract.

The detailed evidence, findings, matrices, untested scope, and retest gates are in the companion files in this directory.
