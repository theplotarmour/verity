# Security Audit

## Security verdict

**NOT READY.** The database tenancy design is unusually strong and was live-proven at the catalog/role layer. The verdict is nevertheless blocked by three P1 boundaries: privileged database credentials in the web container, inconsistent active-module enforcement on direct page reads, and the audited runtime's stale critically affected Next.js installation. CI and full adversarial regression proof are also unavailable.

## Threat model

| Actor/path | Protected asset | Primary controls | Current result |
|---|---|---|---|
| Unauthenticated internet client | Accounts, server actions, metrics, scheduler, image optimizer | Supabase/OIDC verification, body limits, shared DB rate limit, secret endpoints, CSP/headers | PARTIAL; public/protected probes behave correctly, but dependency/runtime integrity is red |
| Authenticated tenant member | Other tenant and out-of-scope organization data | membership-derived tenant, `withTenant`, RLS/FORCE RLS, permission scopes, redaction | Strong design; catalog proven, cross-tenant scenarios untested now |
| Tenant admin | Platform/HQ and other tenants | platform-operator projection and HQ gates | Static/runtime unauth denial observed; authenticated multi-tenant proof untested |
| Suspended/unentitled tenant user | Capability data/functions | TenantActivation plus command/query checks and navigation composition | FAIL on presentation plane: direct Server Component reads omit activation check |
| Compromised web process | Database and secrets | non-root container, app DB role, RLS | FAIL: web process is also given privileged `DIRECT_URL` in enterprise Compose |
| Malicious upload/import | storage, parser, internal network | allowlist, size cap, magic-byte validation, tenant prefix, sealed key | PASS by source; live object-store path untested |
| Malicious tenant record/tool result against AI | commands/data | prompt-injection boundary, grounding, command authorization, confirmation class | Strong static/pure-test evidence; live provider path not proven |

## Authentication and sessions

- Supabase SSR uses `getUser()`, not an unverified session object.
- OIDC verifies issuer/audience/signature and maps only configured principal/email claims.
- Active membership is a signed HS256 cookie, then rechecked against the authenticated user's memberships on every resolution.
- Cookies are HTTP-only, SameSite Lax, and Secure in production.
- Sign-in uses a database-backed hashed shared rate limit and uniform credential errors.
- Failures:
  - OIDC browser login is unbuilt; no route sets `verity_oidc_id_token`.
  - `createTeamLogin`, `resetTeamPassword`, `changeOwnPassword`, and password sign-in are Supabase-specific, so provider substitution is not end-to-end.
  - `/sign-in` links to `/reset-password`, but the route is absent from source and build output.

## Tenant isolation and RLS

Live read-only result (E-DB-01):

| Check | Result |
|---|---|
| Current role | `verity_app`; not superuser; no BYPASSRLS |
| Public tables | 140 |
| Application tables with RLS | 139/139 |
| Application tables with FORCE RLS | 139/139 |
| Policies | 170 across all 139 application tables |
| RLS tables without policy | 0 |
| `_prisma_migrations` runtime grant | none |
| `request_quota` raw runtime grant | none; function-only access |
| Runtime CREATE on `public`/`verity` schema | false |

This is a `PASS` for catalog enforcement and least-privileged runtime-role identity. It is not a current cross-tenant data test: the normal suites were blocked by the remote database guard.

## Authorization and module enforcement

- Commands and registered queries resolve the owning capability and call `requireCapabilityActive` before execution.
- Role permission, organization/location scope, and field redaction are explicit layers; absence of a role fails closed.
- Many pages instead call `withTenant` and Prisma directly. They perform permission/scope checks but do not call the active-capability gate. Navigation only hides links. A user with a retained permission and saved URL can therefore read a suspended capability's page/data. See VCA-006.
- Direct external-auth actions authorize membership management before using the Supabase service role and verify the target belongs to the current tenant before password reset.

## Request, route, and API security

- `/api/agent/chat` requires an actor, rate-limits, caps/parses the request body, and routes tools through normal authorization.
- `/api/scheduled` and `/api/metrics` use constant-time bearer-secret comparison and fail closed when no secret is configured.
- Root/configuration redirect unauthenticated users to sign-in; unauthenticated HQ access is denied; metrics/scheduled returned 401 in the runtime probe.
- CSP uses a per-request nonce, `strict-dynamic`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'`. Headers add DENY, nosniff, strict referrer policy, and HSTS.
- Health/readiness are intentionally public. Readiness reports database connectivity only; it can be green while identity, storage, scheduler, or restored business data is unusable.
- Normal unauthenticated page requests create server error stack logs before redirect/denial. This is operational noise and discloses local source paths to log readers, not to the HTTP caller.

## Files, evidence, import, and export

- Upload types are closed; AVIF is not accepted. Files are tenant-prefixed, reserved with declared size/type, downloaded server-side for verification, checked by magic bytes, and copied to a fresh non-uploadable key before `Stored` status.
- S3 SDK errors are scrubbed because signed URLs contain credential material.
- No current live S3/MinIO upload/download/delete test was run.
- The pure customer-import test currently fails because its supposed valid GSTIN has an invalid check digit. Production validation is doing the safer thing; the release test is stale.

## Secrets, configuration, logs, and privacy

- No tracked secret was confirmed by the filename/pattern scan. `.env`, `pacreds.txt`, and generated deploy env are ignored.
- `pacreds.txt` is non-empty unstructured credential-like local material. It was not opened beyond a redacted shape scan. Its presence is an endpoint-security/secret-management risk outside Git.
- Application logs have structured redaction and tests; readiness scrubs URL user/password material.
- The enterprise web container's `DIRECT_URL` exposure defeats the otherwise strong runtime-role boundary.
- Configuration documentation is drifting from runtime variable names, increasing the chance of a missing provider or silently unbound storage/AI feature.

## Data integrity, audit, and business controls

- Commands are transactional, version-aware, activity/event emitting, and generally use terminal-state immutability and compensating operations.
- Security and activity streams have append-only database protection in migrations.
- Build and static evidence are positive, but the full DB suite and current business-chain regressions were not executed; financial/tax/stock invariants remain `UNTESTED` at this snapshot.

## AI and integration security

- The agent system prompt treats records and tool output as untrusted, uses exact grounding, narrows tool manifests by actor permissions, and routes mutation through the command plane.
- Destructive commands require approval classification; deterministic application logic, not the model, computes business results.
- HTTP integration code signs requests and scrubs hostile upstream bodies, but its `node:crypto` import reaches Edge/client instrumentation import traces and produces a production-build warning. It did not fail the build.
- The currently configured model/provider was not called; no customer data was sent to an AI provider during this audit.

## Dependency security

- Clean committed artifact: Next.js 16.3.3, patched for the August 2026 critical advisories.
- Working installation/runtime: Next.js 16.2.10, affected by the AVIF optimizer RCE advisory (<16.3.3) and Server Function source-disclosure advisory (<16.2.11). The remote image pattern admits any `*.supabase.co` public-storage URL, which broadens the AVIF optimizer input surface even though application uploads reject AVIF.
- Vitest 4.1.10 / `@vitest/mocker` 4.1.10 has a moderate arbitrary-file-read advisory fixed in 4.1.11. Its unauthenticated path requires an exposed development/HMR service; it is not a production-runtime package.

Official advisory references: [Next.js August 2026 Security Release](https://nextjs.org/blog/august-2026-security-release), [AVIF image optimization RCE GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [Server Function source disclosure GHSA-955p-x3mx-jcvp](https://github.com/vercel/next.js/security/advisories/GHSA-955p-x3mx-jcvp), and [Vitest file-read advisory GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).

