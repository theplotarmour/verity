# Task Plan 108 — Complete Audit Remediation, Corrective Work, and Upgrade Program

**Status:** IN PROGRESS — executing phase-by-phase; closure requires the evidence gates below.  
**Audit source:** `audit/complete-verity-2026-09/`  
**Audited snapshot:** `main@2a71102e3489231227613d1b5c1115f82c55fec3`  
**Program scope:** all 21 findings in the canonical ledger, all associated corrective work, bounded dependency/runtime upgrades, one supportable on-premises profile, modular-platform completion, and final recertification.  
**Current verdict:** **NOT READY FOR ENTERPRISE DEPLOYMENT**; **NOT A COMPLETE MODULAR PLATFORM**; supplied on-premises profiles are not yet production-ready.

---

## 1. Purpose

This is the execution-grade plan for closing the complete Verity audit. It is
not a new audit, a release claim, or authorization to batch unrelated changes.
It translates every finding into an ordered work package with:

- explicit repository surfaces;
- prerequisite decisions and dependencies;
- security invariants that may not be weakened;
- implementation and migration steps;
- negative, adversarial, recovery, and deployment tests;
- rollout and rollback rules;
- evidence deliverables;
- objective exit criteria.

The plan deliberately distinguishes four different outcomes:

1. **Security remediation** — close exploitable or control-defeating defects.
2. **Operational completion** — make one defined on-premises profile installable,
   observable, upgradeable, and recoverable.
3. **Modular completion** — implement the missing Industry Pack, versioning,
   extension, dashboard, and template control planes.
4. **Certification** — prove the exact built artifact and supported profile,
   rather than inheriting old green claims.

Passing one outcome does not imply the others passed.

---

## 2. Program rules and non-negotiable invariants

### 2.1 Change-control rules

1. Preserve `audit/complete-verity-2026-09/` as immutable pre-remediation
   evidence. Corrections go into a new remediation evidence directory.
2. Use one narrowly scoped branch or worktree per work package. Do not combine
   identity, database privilege, modularity, and dependency changes in one PR.
3. Do not commit or push merely because this plan exists. Execution requires an
   explicit implementation instruction.
4. Record the starting commit, resulting commit, lockfile hash, container image
   digest, migration checksum set, and test-environment identity for every gate.
5. Any newly discovered P0/P1 stops release certification and is added to the
   findings ledger before other work continues.
6. A plan, code review, build, or `npm audit` result alone never closes a
   finding. The finding-specific retest gate must pass.

### 2.2 Security invariants

1. `DATABASE_URL` for application traffic must resolve to the non-superuser,
   `NOBYPASSRLS` runtime role (`verity_app` or an equivalently constrained role).
2. `DIRECT_URL` is privileged migration/administration material and must never
   be present in the long-running web process.
3. Preserve `assertRlsEnforceable()` and its fail-closed behavior. Never bypass,
   mock away, or weaken it to make a test or deployment pass.
4. Never run destructive or tenant-isolation tests against a shared or remote
   database. Use an ephemeral, explicitly disposable local database.
5. Tenant context, authorization, active capability state, dependency state,
   and input validation must all be established before a protected read or
   mutation.
6. Navigation hiding is presentation only. Direct route, API, query, action,
   upload, scheduled-job, and agent/tool paths must independently enforce the
   same security state.
7. Production validation remains fail closed. Correct stale fixtures and
   configuration; do not relax GSTIN, secret, session, provider, or tenancy
   checks to recover green tests.
8. Authentication failures and expected denials must not leak secrets, raw
   tokens, database details, or stack traces to users or ordinary logs.
9. Restore and upgrade processes fail closed. A partial restore, migration
   failure, checksum mismatch, or post-restore invariant failure must keep
   traffic disabled.
10. Client extensions must be declarative or run inside a deliberately designed
    trust boundary. This program does not authorize arbitrary tenant-supplied
    server code.

### 2.3 Product and documentation rules

1. Authority remains: `verity-bible/` → `verity-spec/` → `implementation/` →
   code/runbooks/task history.
2. Label behavior as **built**, **partial**, **planned**, **demonstrated**, or
   **target**. Do not convert a passing sample flow into a platform-wide claim.
3. Industry Pack, version pinning, extensions, dashboard contributions, and
   templates are incomplete until their runtime and lifecycle tests pass.
4. Optional HA and air-gapped profiles are excluded from the first production
   certification. They require separate topology and threat-model work.

---

## 3. Target support profile

The first certifiable on-premises target is intentionally narrow:

| Concern | Initial supported target |
|---|---|
| Host | One supported Linux host with Docker Engine and Compose |
| Network | TLS-terminating reverse proxy; only application HTTPS exposed |
| Database | Local PostgreSQL with separate migration and runtime principals |
| Object storage | Local MinIO using the S3 driver |
| Identity | One explicitly selected, complete browser identity profile |
| Scheduler | Local durable scheduler invoking every declared cadence |
| Backups | Encrypted off-host database + object-store backup pair |
| Observability | Bounded logs, health/readiness, job outcomes, alerts, build ID |
| Upgrades | Signed/digested release, preflight, backup, migrate, smoke, rollback |

The identity architecture must be decided in WP-05. Until then, OIDC must be
described as bearer verification only, not interactive browser parity.

---

## 4. Finding-to-work-package traceability

| Finding | Severity | Primary work package | Closure proof |
|---|---:|---|---|
| VCA-001 invalid required CI workflow | P1 | WP-01 | Fresh required workflow completes every gate on exact commit |
| VCA-002 web receives `DIRECT_URL` | P1 | WP-03 | Runtime container has no privileged credential; migrations remain operable |
| VCA-003 incomplete browser OIDC | P1 | WP-05 | Fresh IdP lab passes login, renewal, logout, lifecycle, and denial scenarios |
| VCA-004 restore masks errors | P1 | WP-07 | Injected failure aborts; blind destroy/restore passes invariants |
| VCA-005 no on-prem scheduler | P1 | WP-06 | Every cadence runs, locks, retries, records, and alerts locally |
| VCA-006 direct page reads bypass capability state | P1 | WP-04 | Complete absent/active/suspended/dependency matrix passes |
| VCA-007 Industry Pack is specification-only | P1 | WP-10 | Empty tenant preview/apply/reapply/rollback/upgrade demonstration |
| VCA-008 descriptive capability pins | P1 | WP-11A | Mixed-version tenant compatibility and failure/rollback suite |
| VCA-009 extension/dashboard/template gaps | P1 | WP-11B | Sample package lifecycle works without core diff and remains isolated |
| VCA-010 missing enterprise acceptance evidence | P1 | WP-09 | All blocked tests run in isolated lab and bind to artifact digest |
| VCA-011 stale vulnerable installed Next runtime | P1 | WP-02 | Clean install/runtime reports locked patched version; hostile image denied |
| VCA-012 nonexistent password recovery route | P2 | WP-05 | Provider-appropriate recovery or intentionally removed link, with E2E proof |
| VCA-013 stale fail-closed test fixtures | P2 | WP-01 | Full suite green without production-validator weakening |
| VCA-014 Vitest file-read advisory | P2 | WP-02 | Fixed test stack and audit evidence; test server remains non-public |
| VCA-015 mutable unsigned releases | P2 | WP-08 | Digested images, SBOM, signature, provenance, reproducible acceptance |
| VCA-016 environment documentation drift | P2 | WP-06 | Each supported profile boots only from its checked template |
| VCA-017 preflight precedes provider configuration | P2 | WP-06 | Fresh operator install succeeds once, without bypasses |
| VCA-018 DB-only readiness | P2 | WP-06/WP-07 | Required dependency/data failures produce documented non-ready state |
| VCA-019 broad function execution assumptions | P3 | WP-03 | Function-by-principal privilege matrix passes |
| VCA-020 expected unauth navigation logs stacks | P3 | WP-06 | Correct response and structured non-error log; real faults retain stacks |
| VCA-021 stale, unbound certifications | P2 | WP-12 | Every readiness statement links to current artifact/profile evidence |

No finding may be closed by changing only its status text.

---

## 5. Dependency order and release gates

```text
WP-00 containment and evidence freeze
  -> WP-01 trustworthy CI and fixtures
      -> WP-02 dependency/runtime integrity
      -> WP-03 database least privilege
      -> WP-04 capability enforcement
          -> WP-05 identity lifecycle
          -> WP-06 on-prem scheduler/config/install/readiness
              -> WP-07 backup, restore, and rollback
              -> WP-08 immutable supply chain
                  -> WP-09 isolated enterprise certification lab
                      -> security + first on-prem profile may be certified
  -> WP-10 Industry Pack control plane
      -> WP-11A enforced capability version lifecycle
      -> WP-11B extensions, dashboards, forms, and templates
          -> modular-platform certification
  -> WP-12 documentation and final verdict reconciliation
```

Safe parallelism after WP-01:

- WP-02, WP-03 design, and WP-04 route inventory may proceed independently.
- WP-05 identity design and WP-06 scheduler design may proceed independently,
  but the installer/readiness implementation must consume the chosen identity
  profile.
- WP-10 manifest design can start after its ADR, but production application of
  packs should wait for capability guards in WP-04.
- WP-11B template primitives may be prototyped independently; extension
  execution and upgrade behavior depend on WP-11A.

Certification remains serial even when implementation is parallel.

### 5.1 Execution phases and live status

| Phase | Work packages | Outcome | Status |
|---|---|---|---|
| Phase 0 — Containment and baseline | WP-00 | Preserve evidence, quarantine stale artifacts, establish closure records | Partial — repository baseline preserved; deployed-artifact/credential inventory requires environment access |
| Phase 1 — Trustworthy release foundation | WP-01, WP-02 | Valid CI, current fixtures, clean dependency tree, bounded security upgrades | Locally implemented and green; exact GitHub/isolated-DB run pending |
| Phase 2 — Core security boundaries | WP-03, WP-04 | Least-privilege database runtime and uniform capability enforcement | Partial — WP-03 code/migration implemented; DB proof and WP-04 remain |
| Phase 3 — Identity lifecycle | WP-05 | Complete selected browser identity and recovery profile | Pending identity ADR |
| Phase 4 — On-prem operations | WP-06 | Install, configure, schedule, observe, and report readiness locally | Pending Phases 2–3 |
| Phase 5 — Recovery and certification | WP-07, WP-08, WP-09 | Fail-closed DR, immutable supply chain, exact-artifact certification | Pending Phase 4 |
| Phase 6 — Modular control plane | WP-10, WP-11A, WP-11B | Packs, enforced versions, constrained extensions and contributions | Pending Phase 2 and ADRs |
| Phase 7 — Authority and final verdict | WP-12 | Reconcile all claims and publish evidence-bound verdicts | Pending all claimed phases |

Phase status is evidence-based. A phase becomes `Complete` only after every
finding-specific exit gate in that phase passes; code written without the
required isolated deployment or recovery proof remains `Partial`.

### 5.2 Execution record — 2026-09-16

Implemented in the first phase run:

- repaired and locally parsed the required verification workflow;
- aligned CI PostgreSQL with the initial on-prem PostgreSQL 16 profile;
- enforced clean Prisma generation and exact security-sensitive versions;
- replaced the stale installed Next.js tree with clean `next@16.3.3`;
- upgraded Vitest and `@vitest/mocker` to `4.1.11`;
- pinned the build/runtime line to Node 22 and migrated Prisma seed settings to
  `prisma.config.ts` without a Prisma major upgrade;
- corrected the stale GSTIN and private-session-secret fixtures;
- prevented test imports from loading application database credentials before
  the isolated-database guard;
- added a separate no-database pure gate (73 tests in the first run);
- removed `DIRECT_URL` from the web service while retaining it for tools;
- added a migration that revokes PUBLIC execution from SECURITY DEFINER
  functions and grants non-trigger execution to `verity_app`;
- replaced the wildcard Supabase image host with the exact configured host;
- removed Node-only crypto from Edge/browser telemetry bundles;
- stopped readiness responses and structured logs from returning raw database
  driver details or connection credentials;
- added workflow and deployment-security invariant validators.

Local gates passed: clean dependency resolution, zero-advisory `npm audit`,
workflow validation, deployment-invariant validation, Prisma validation/client
generation, pure tests, typecheck, lint with one pre-existing TanStack compiler
warning, production build, standalone health smoke, non-ready DB behavior, and
hostile image-host rejection.

Still blocked on this host: Docker/Compose acceptance, local PostgreSQL
migration/RLS/function-ACL proof, the complete integration suite, and a fresh
GitHub required-check run. These are closure gates, not waived checks.

---

## 6. WP-00 — Immediate containment and remediation baseline

**Findings addressed:** containment for VCA-002, VCA-003, VCA-004, VCA-011.  
**Size:** S.  
**Production behavior change:** none unless a currently deployed affected
artifact or credential is discovered.

### Work

1. Record repository commit, dirty-tree state, `package-lock.json` hash, local
   installed dependency tree, Node/npm version, and any currently deployed
   image digests.
2. Inventory all deployments built from the stale local `next@16.2.10` tree.
   Quarantine or replace any such artifact; do not expose the audited local
   runtime.
3. Inspect deployed web environments without printing secret values. If any web
   process received `DIRECT_URL`, treat the PostgreSQL superuser credential as
   exposed and schedule rotation after the runtime boundary is corrected.
4. Add temporary operator notices:
   - OIDC is bearer-verification-only;
   - current on-prem profile is not production-ready;
   - `deploy/scripts/restore.sh` is not approved for production recovery.
5. Create `audit/remediation-verity-2026-09/` when implementation begins, with
   an evidence index and one closure record per VCA identifier.

### Exit criteria

- No known exposed service is built from the stale dependency tree.
- Affected deployment and credential inventory exists.
- Operators cannot reasonably mistake incomplete OIDC or restore behavior for a
  supported production path.
- Pre-remediation audit evidence remains unchanged.

---

## 7. WP-01 — Restore a trustworthy release signal

**Findings closed:** VCA-001, VCA-013.  
**Primary surfaces:** `.github/workflows/verify.yml`, ESLint configuration,
configuration tests, import/GSTIN fixtures, branch-protection settings.  
**Size:** M.  
**Depends on:** WP-00.

### Implementation steps

1. Remove the duplicate Supabase environment keys from `verify.yml`. Keep one
   deterministic placeholder set and preserve the mandatory private session
   signing secret.
2. Validate workflow syntax before push using a YAML parser and an Actions-aware
   linter. A parse-only check is necessary but not sufficient.
3. Preserve the isolated PostgreSQL service and separate principals:
   - privileged role applies migrations and grants;
   - runtime role is `NOSUPERUSER NOBYPASSRLS`;
   - runtime role cannot read migration metadata or quota internals.
4. Run `prisma generate` explicitly before typecheck so CI does not depend on an
   existing generated client.
5. Correct stale positive fixtures:
   - use an independently verified valid GSTIN checksum fixture;
   - provide the private session secret in positive config cases;
   - add negative cases proving both validators still reject bad input.
6. Scope lint to the repository-owned source/config surface and explicitly
   ignore nested worktrees, generated audit scratch, `.next`, coverage, build,
   and external mockup directories. Do not silence real repository warnings.
7. Add a fast pre-job validation for workflow syntax and lockfile consistency.
8. Configure the verification job as a required branch check after its first
   successful run. Verify it cannot be bypassed by path filters or skipped
   status semantics.
9. Upload machine-readable results for dependency inventory, migrations,
   typecheck, lint, tests, build routes, and security test summaries.

### Required CI order

```text
checkout
-> set supported Node/npm
-> npm ci
-> assert dependency versions
-> prisma generate
-> create non-bypass runtime role
-> migrate deploy through privileged URL
-> grant exact runtime privileges
-> prove runtime role attributes
-> schema/migration consistency
-> typecheck
-> lint
-> pure tests
-> DB/RLS/integration tests
-> production build
-> standalone smoke
```

### Negative checks

- Duplicate YAML key causes the pre-job validator to fail.
- Missing private session secret fails configuration tests.
- Runtime DB role with `rolsuper=true` or `rolbypassrls=true` fails before tests.
- A DB-dependent suite cannot report success by skipping because its database is
  absent.
- An invalid GSTIN remains rejected.

### Exit criteria

- A fresh run on the exact remediation commit executes every step and is green.
- Required status is enforced on protected branches.
- No production validator or fail-closed guard was weakened.
- The evidence bundle contains logs/artifacts sufficient to reproduce the run.

---

## 8. WP-02 — Dependency, toolchain, and runtime integrity upgrades

**Findings closed:** VCA-011, VCA-014.  
**Additional corrective work:** Node/PostgreSQL version drift, Prisma seed-config
deprecation, remote-image allowlist hardening.  
**Primary surfaces:** `package.json`, `package-lock.json`, CI, Dockerfile,
Compose, `next.config.*`, generated build metadata.  
**Size:** M.  
**Depends on:** WP-01.

### Upgrade policy

1. Keep Next.js and `eslint-config-next` pinned to the exact audited fixed line
   already committed (`16.3.3`) unless a newly published security advisory
   requires a newer compatible fixed release at execution time.
2. Delete/recreate local dependencies with `npm ci`; never repair the stale tree
   by an unrecorded incremental install.
3. Upgrade Vitest and its resolved `@vitest/mocker` to at least the first fixed
   release (`4.1.11` in the audit evidence), with only required lockfile churn.
4. Do not bundle broad dependency modernization into this security closure.
   Additional major upgrades get separate compatibility plans.
5. Select and pin one currently supported Node runtime for CI, build, tools, and
   web images. Document any deliberately tested secondary version. Resolve the
   current CI/local/container mismatch instead of accepting accidental coverage.
6. Decide the supported PostgreSQL major for the first on-prem profile. CI must
   test that exact major; a second major may be a compatibility lane, not the
   only lane.
7. Move Prisma seed configuration from deprecated `package.json#prisma` to the
   repository-supported Prisma configuration file in a separate, behavior-neutral
   commit.
8. Narrow `next/image` remote patterns from wildcard Supabase tenancy to the
   configured project/storage host. Reject attacker-owned Supabase hosts and
   unsupported image formats/redirect chains.
9. Embed runtime provenance: application version, commit, lockfile hash, Node
   version, Next version, and image digest.

### Verification

```text
npm ci
npm ls next eslint-config-next vitest @vitest/mocker
npm audit --json
npm run prisma:generate
npm run typecheck
npm run lint
npm test
npm run build
standalone/container version and startup check
```

Run the Task 47 regression matrix again:

- unauthenticated → protected route;
- authenticated → permitted route;
- authenticated → unauthorized route;
- wrong tenant → resource;
- malformed/expired session → protected route;
- public health/readiness behavior;
- malformed server action input → auth → authorization → tenant scope → no
  mutation;
- hostile remote image URL and malicious AVIF path rejected.

### Rollback

- Dependency changes are isolated from schema changes.
- Preserve the prior lockfile and image digest.
- Roll back only to a version proven not to reintroduce a known advisory.
- A rollback that restores vulnerable Next/Vitest versions is prohibited; fix
  forward or use the last known safe artifact.

### Exit criteria

- Clean installs and deployed artifacts report the intended versions exactly.
- Original Next and Vitest advisories are absent.
- No unexpected direct/transitive package drift is present.
- All regression and deployment gates pass from a clean build context.

---

## 9. WP-03 — Database privilege separation and function ACL hardening

**Findings closed:** VCA-002, VCA-019.  
**Primary surfaces:** `deploy/compose/docker-compose.yml`, deploy scripts and env
template, `src/server/platform/config.ts`, migrations defining `SECURITY
DEFINER` functions, CI grants, backup/upgrade runbooks.  
**Size:** M.  
**Depends on:** WP-01; coordinate with WP-07.

### Implementation steps

1. Remove `DIRECT_URL` from the `web` service entirely. Keep it only in an
   explicitly invoked one-shot migration/administration tool.
2. Ensure runtime configuration does not require or load the privileged URL for
   normal application startup, readiness, background calls, or Server Actions.
3. Separate secrets by purpose and lifecycle:
   - runtime DB password;
   - migration/admin DB password;
   - backup/restore credential if distinct;
   - scheduler authentication secret.
4. Rotate privileged credentials in every environment that supplied them to the
   web process. Record rotation completion without recording secret values.
5. Inventory every `SECURITY DEFINER` function and record owner, search path,
   volatility, input validation, intended callers, and required table access.
6. Set a safe immutable `search_path` on each definer function.
7. Revoke `EXECUTE` from `PUBLIC`; grant only to the exact intended principal.
   Avoid `GRANT EXECUTE ON ALL FUNCTIONS` as the steady-state policy.
8. Update default privileges so future functions do not silently regain public
   execution.
9. Add a migration verification query that fails if:
   - runtime role is superuser or bypasses RLS;
   - web has privileged connection material;
   - any protected definer function is public-executable;
   - function ownership/search path differs from policy.

### Test matrix

| Principal | Runtime tables | Migration metadata | Definer functions | RLS bypass |
|---|---|---|---|---|
| Web runtime | scoped CRUD only | denied | explicit allowlist | denied |
| Scheduler runtime | minimum scoped calls | denied | scheduler allowlist | denied |
| Migration tool | controlled admin | allowed | administration only | privileged by design |
| Anonymous DB connection | denied | denied | denied | denied |

Also prove:

- two hostile tenants cannot read/update/delete each other's records;
- stolen runtime credentials cannot disable RLS, assume another tenant, apply a
  migration, or invoke an ungranted function;
- migrations succeed only in the tools profile;
- application startup and all representative flows work with no `DIRECT_URL`.

### Rollout and rollback

1. Deploy code/config that no longer needs `DIRECT_URL`.
2. Apply function-ACL migration through the controlled tool.
3. verify privileges and tenant isolation;
4. rotate admin credential;
5. restart web and inspect its redacted environment;
6. retain a tested rollback migration for ACL mistakes, but never restore
   `DIRECT_URL` to web as a rollback mechanism.

### Exit criteria

- Long-running application and scheduler processes possess no migration/admin
  credential.
- Exact function privilege matrix passes on a fresh and upgraded database.
- Cross-tenant and runtime-role hostile tests pass.

---

## 10. WP-04 — Uniform active-capability enforcement

**Finding closed:** VCA-006.  
**Primary surfaces:** `src/server/platform/capability.ts`, `command.ts`,
`query.ts`, route/layout ownership metadata, capability-owned Server Components,
route handlers, actions, uploads, scheduled work, agent tools.  
**Size:** L.  
**Depends on:** WP-01; security certification depends on WP-03.

### Design requirement

Create one authoritative capability-ownership and activation guard that can be
applied consistently at each execution plane. Do not infer ownership only from
navigation or duplicate hard-coded route lists across components.

### Implementation steps

1. Generate a route and execution-surface inventory for all 20 capabilities:
   page/layout, route handler, query, command, action, scheduled handler, upload,
   export, agent/tool, and background work.
2. Extend capability registration metadata with explicit owned route namespaces
   and non-route entry points, or create an equivalent compile-time checked
   ownership registry.
3. Add a server-side route/layout guard that checks:
   - authenticated tenant context;
   - entitlement/activation exists;
   - activation state is `Active`;
   - dependencies are active and compatible;
   - principal retains required permission/scope.
4. Migrate direct Prisma reads behind registered queries where practical. Where
   a Server Component legitimately reads directly, require the route guard and
   make the exception visible in the inventory.
5. Apply equivalent checks to APIs, actions, uploads, exports, scheduled jobs,
   and agent tools. Avoid double-execution or inconsistent error semantics.
6. Define stable denial behavior:
   - UI receives a non-leaking unavailable/forbidden state;
   - APIs receive the documented status/error code;
   - mutations make no write;
   - audit log captures tenant, capability, surface, reason, and correlation ID.
7. Handle suspension races: a request begun before suspension may finish only
   under an explicit transaction policy; new work must fail immediately.
8. Add a static conformance test that fails when a registered capability adds an
   unowned or unguarded execution surface.

### Mandatory state matrix

For every capability and every applicable surface:

| State | Navigation | Direct page/read | API/action/write | Scheduled/agent |
|---|---|---|---|---|
| Absent | hidden | denied | denied/no write | denied/no work |
| Active + dependencies active | visible if authorized | allowed if authorized | allowed if authorized | allowed if authorized |
| Suspended | hidden | denied | denied/no write | denied/no work |
| Dependency absent/suspended | unavailable | denied | denied/no write | denied/no work |
| User lacks permission/scope | hidden or disabled | denied | denied/no write | denied/no work |
| Wrong tenant | never disclosed | not found/denied | denied/no write | denied/no work |

### Exit criteria

- Inventory has no unexplained direct-read or unguarded execution path.
- The matrix passes for all registered capabilities, not a representative sample.
- Suspend/reactivate events are audited and take effect across every plane.
- Existing command/query chokepoints remain fail closed.

---

## 11. WP-05 — Complete identity, session, and account lifecycle

**Findings closed:** VCA-003, VCA-012.  
**Primary surfaces:** `src/server/platform/auth.ts`, `authProvider.ts`, `oidc.ts`,
sign-in UI/actions, new callback/logout/recovery routes, user provisioning and
tenant membership administration, deploy identity configuration.  
**Size:** XL.  
**Depends on:** WP-01 and an approved identity ADR.

### Required architecture decision

Choose exactly one initial production profile:

1. **Complete OIDC browser profile:** authorization-code flow with PKCE, state,
   nonce, callback, secure application session, renewal, logout, and a defined
   provisioning/recovery policy; or
2. **Explicit hybrid Supabase-auth profile:** local data/storage but Supabase
   remains the supported identity dependency, clearly documented and checked by
   readiness.

Do not implement ambiguous half-parity. Bearer-only OIDC may remain a separate
API integration mode but cannot be called the interactive browser profile.

### OIDC browser implementation requirements

1. Authorization endpoint discovery from a trusted issuer allowlist.
2. Authorization code + PKCE; never implicit flow.
3. Cryptographically random, single-use, expiring `state` and `nonce` bound to
   the initiating browser session and return path.
4. Strict issuer, audience, signature, algorithm, time, nonce, and authorized
   party validation.
5. JWKS caching with bounded refresh and safe key-rotation behavior.
6. Secure, HttpOnly, SameSite cookie policy; production `Secure`; bounded idle
   and absolute lifetime; key rotation with explicit grace period.
7. CSRF protection on state-changing requests independent of SameSite defaults.
8. Explicit logout behavior covering local session and supported IdP logout.
9. Provider-neutral internal principal mapped to tenant membership. Never use
   untrusted email/domain alone to grant a tenant or role.
10. Defined just-in-time versus pre-provisioned onboarding, deactivation,
    membership removal, role updates, and identity re-link approval.
11. Audit events for login success/failure, callback validation failure, logout,
    renewal, provisioning, membership changes, recovery, and tenant switching;
    no raw tokens in logs.

### Recovery requirements

For Supabase auth, implement `/reset-password` and completion flow with:

- enumeration-resistant request response;
- expiring, single-use, tamper-resistant provider token handling;
- password policy and session revocation decision;
- reused/expired/tampered-token denial;
- audit events without secret material.

For OIDC, recovery belongs to the IdP. Remove or replace the local password link
with provider-appropriate guidance. Do not present an impossible local flow.

### Adversarial tests

- forged/missing state, nonce mismatch, PKCE failure;
- wrong issuer/audience/algorithm, expired/not-yet-valid token;
- JWKS rotation and unavailable IdP;
- callback replay and parallel-login confusion;
- session fixation, cookie tampering, stale signing key, logout replay;
- unknown/deactivated/unprovisioned user;
- email collision and attempted cross-tenant identity link;
- unauthorized tenant switch and stale role after deprovisioning;
- password-recovery account enumeration, reused token, expired token;
- redirect allowlist/open-redirect attempts.

### Exit criteria

- A fresh IdP/Supabase lab completes the full browser lifecycle with no external
  undocumented glue.
- API bearer behavior remains isolated from browser-session behavior.
- Provider switch changes no tenant authorization semantics.
- Recovery behavior is truthful and operational for each supported provider.

---

## 12. WP-06 — On-prem scheduler, configuration, installer, readiness, and logs

**Findings closed:** VCA-005, VCA-016, VCA-017, VCA-018 operational portion,
VCA-020.  
**Primary surfaces:** `deploy/scripts/install.sh`, Compose profiles,
`deploy/config/verity.env.example`, `deploy/docs/install.md`,
`src/server/platform/config.ts`, `/api/ready`, `/api/scheduled`, structured
logging and metrics.  
**Size:** XL.  
**Depends on:** WP-03, WP-05 profile decision.

### A. Canonical configuration contract

1. Define one typed configuration schema per supported profile. Generate or
   validate operator templates from it to prevent hand-maintained drift.
2. Reconcile current naming differences, including OpenAI/LLM variables and
   S3/`VERITY_S3_*` variables. Support aliases only through an explicit,
   time-bounded deprecation path.
3. Classify each variable as build-time public, runtime public, runtime secret,
   migration-only secret, optional, or profile-required.
4. Add secret-quality checks for defaults/placeholders and prevent secret values
   from appearing in diagnostic output.
5. Add `config validate --profile <profile>` or equivalent dry-run output that
   reports missing/invalid keys and never connects with a privileged URL from web.

### B. Installer state machine

Split the current first-run sequence:

```text
host preflight
-> select supported profile
-> generate secrets
-> collect provider configuration
-> validate complete configuration
-> pull/build digested artifacts
-> start infrastructure
-> run migrations through tools
-> bootstrap first operator
-> start web + scheduler
-> readiness and browser smoke
-> print recovery-safe next steps
```

The process must be resumable and idempotent. A failure must report the exact
stage and safe retry action without leaving an apparently healthy partial install.

### C. Local scheduler

1. Package a supported scheduler service or worker in Compose.
2. Derive cadence inventory from capability schedule contributions and include
   frequent, hourly, daily, and weekly work as declared.
3. Authenticate calls with a dedicated secret unavailable to browsers.
4. Add distributed/advisory locking, per-job idempotency, overlap prevention,
   bounded retry with jitter, and dead-letter/manual replay semantics.
5. Store outcome, duration, correlation ID, attempt, next run, and last success.
6. Define timezone behavior explicitly; system/database business timestamps
   remain UTC while tenant-facing schedules use a declared tenant/timezone rule.
7. Alert when a cadence misses its maximum allowed interval or repeatedly fails.

### D. Profile-aware readiness

Readiness should be cheap, bounded, and truthful. It must check:

- database connectivity through the runtime role;
- migration/schema compatibility;
- RLS-enforceability assertion status;
- selected identity-provider configuration and essential reachability;
- selected object-store bucket access with a non-destructive check;
- scheduler heartbeat/last-success freshness;
- restore quarantine marker and post-restore verification status;
- required cryptographic/session secrets;
- no privileged URL in the web runtime.

Optional dependencies must not fail profiles that explicitly exclude them. Each
component returns a stable machine-readable reason without secrets.

### E. Expected denial logging

1. Model authentication-required, forbidden, capability-inactive, and not-found
   outcomes as expected request results, not unhandled server exceptions.
2. Log a structured low-severity event with correlation ID and reason code; omit
   stack traces for routine unauthenticated navigation.
3. Preserve full stack/cause for genuine system faults in protected telemetry.
4. Add redaction tests for tokens, cookies, database URLs, S3 keys, and PII.

### Exit criteria

- A non-expert operator completes one fresh install without bypasses.
- Reboot/restart preserves service, identity, storage, and scheduled operation.
- Every cadence executes and sustained failure alerts.
- Each required dependency failure makes readiness non-green with a useful code.
- Expected unauthenticated requests do not pollute error telemetry or leak stacks.

---

## 13. WP-07 — Backup, restore, disaster recovery, and upgrade rollback

**Findings closed:** VCA-004 and recovery portion of VCA-018.  
**Primary surfaces:** `deploy/scripts/backup.sh`, `restore.sh`,
`deploy/runbooks/backup-restore.md`, object-store tooling, readiness quarantine,
upgrade scripts.  
**Size:** XL.  
**Depends on:** WP-03, WP-06, and a recovery ADR/runbook decision.

### Define one supported backup contract

Decide and document whether the authoritative database artifact is:

- full logical backup restored into an empty compatible cluster; or
- data-only backup restored after exact migrations.

The script and runbook must implement the same contract. Retire the alternate
path or label it unsupported. Record PostgreSQL major/tool compatibility.

### Backup set requirements

1. Database dump with strict command failure and checksum.
2. Object-store snapshot/export paired to the same logical recovery point.
3. Manifest containing artifact version, commit/image digest, schema migration
   set, timestamps, tenant counts, object counts/bytes, and encryption metadata.
4. Separately protected identity-provider configuration, deployment
   configuration, and secret-rotation instructions. Do not package plaintext
   live secrets casually with data backups.
5. Encrypted off-host retention with tested access and documented rotation.

### Restore state machine

```text
verify backup checksums and compatibility
-> stop/quarantine traffic and scheduler
-> restore into empty isolated target
-> fail immediately on any unapproved DB/object error
-> apply/verify required migration state
-> restore object store
-> verify structural and security invariants
-> run authenticated application smoke
-> explicitly release quarantine
```

Remove any `pg_restore ... || warn` success conversion. `SELECT 1` is not a
restore proof.

### Post-restore proof

- migration checksums and schema fingerprint;
- tenant/entity row counts and selected business reconciliations;
- foreign-key and uniqueness integrity;
- RLS policies, role attributes, grants, default privileges;
- definer-function owners, ACLs, and safe search paths;
- triggers, indexes, extensions, sequences, and timezone;
- database-to-object references and sampled object hashes;
- identity-to-internal-principal mappings;
- scheduler state and idempotent resume;
- representative authenticated tenant flow and hostile cross-tenant denial.

### Failure injection

- corrupt/truncated database dump;
- wrong PostgreSQL/tool version;
- one failed `pg_restore` object;
- missing object-store segment;
- checksum mismatch;
- migration mismatch;
- incorrect runtime grants/RLS;
- unavailable IdP or object store;
- scheduler restarted before verification.

Every case must remain quarantined and produce an actionable non-zero outcome.

### RPO/RTO and rollback

1. Define business-approved RPO/RTO for the initial profile.
2. Measure them in a blind rehearsal; do not estimate from script duration.
3. For application upgrades, define forward migration, rollback-compatible
   window, irreversible migration marker, and restore decision point.
4. Never roll application code back across an incompatible schema without its
   tested compatibility or restore path.

### Exit criteria

- Blind destroy-and-restore succeeds within approved RPO/RTO.
- Every injected failure prevents traffic and reports failure.
- Database, files, identity mapping, scheduled work, and isolation all pass.
- Upgrade rollback has been rehearsed against the exact release artifact.

---

## 14. WP-08 — Immutable builds, SBOM, signatures, and release provenance

**Finding closed:** VCA-015.  
**Primary surfaces:** Dockerfile, Compose image references, CI release workflow,
upgrade/install scripts, release manifest.  
**Size:** L.  
**Depends on:** WP-02 and WP-03; consumed by WP-09.

### Implementation steps

1. Pin builder/runtime base images by digest. Track human-readable tags alongside
   digests for maintenance, never as the deployment identity.
2. Resolve all application dependencies through `npm ci` from a committed
   lockfile in a clean build context.
3. Pin third-party CI actions to reviewed commit SHAs and record update policy.
4. Produce separate least-privilege runtime and operator-tools images.
5. Generate SPDX or CycloneDX SBOMs for application and container layers.
6. Generate build provenance/attestation binding source commit, workflow,
   lockfile, builder identity, and output digest.
7. Sign release images and verify signatures before installation/upgrade.
8. Replace mutable Compose tags with exact approved digests in release bundles.
9. Add vulnerability policy with severity, exploitability, exception owner,
   expiry, and re-scan cadence. A scan is evidence, not automatic acceptance.
10. Confirm runtime image has no compiler, package manager, source secrets,
    migration credential, test server, shell tooling beyond justified needs, or
    writable application code.

### Verification

- Rebuild twice from the same source/lock in controlled builders and compare the
  defined reproducibility outputs or explain documented nondeterministic fields.
- Refuse an unsigned, wrong-key, or digest-mismatched artifact.
- Install with registry tag moved to another digest; verified installer must
  still use/refuse based on the approved digest.
- Scan SBOM and running image; reconcile installed Next/Node/native library
  versions with provenance.
- Run full acceptance against the exact signed digest.

### Exit criteria

- The release can be identified and reproduced from source to deployed digest.
- Installer and upgrade path verify signature and digest before execution.
- SBOM/provenance are archived beside acceptance evidence.

---

## 15. WP-09 — Isolated enterprise verification and first-profile certification

**Finding closed:** VCA-010.  
**Primary surfaces:** CI, Playwright/E2E suites, Docker acceptance harness,
ephemeral PostgreSQL/MinIO/IdP lab, recovery harness, audit evidence.  
**Size:** XL.  
**Depends on:** WP-01 through WP-08.

### Lab requirements

Provision a disposable environment with:

- the exact supported Linux/container runtime;
- target PostgreSQL major with admin + non-bypass runtime roles;
- MinIO and a private test bucket;
- the selected test OIDC/Supabase identity profile;
- reverse proxy/TLS matching production headers;
- local scheduler;
- no connection to shared production/staging data;
- deterministic tenant A, tenant B, operator, scoped user, unauthorized user,
  and suspended-capability fixtures.

### Required verification tracks

1. **Clean installation:** empty VM to login using only the release bundle and
   supported documentation.
2. **Schema:** migrate deploy, migration checksums, idempotent restart, no drift.
3. **Database security:** role properties, RLS enforceability, two-tenant hostile
   CRUD, definer ACLs, raw/runtime credential abuse.
4. **Authentication/session:** login, callback, renewal, logout, malformed and
   stale sessions, deactivation, tenant switch, recovery.
5. **Authorization:** role/permission/scope/redaction matrix across UI, API,
   actions, exports, uploads, jobs, and agents.
6. **Capability state:** all 20 capabilities under absent, active, suspended,
   dependency-missing states.
7. **Business chains:** deterministic end-to-end paths for every capability and
   cross-capability invariant claimed ready.
8. **Files:** upload/download/delete authorization, MIME/signature/size/path
   abuse, object reference integrity, backup/restore.
9. **Scheduled work:** every cadence, overlap, retry, idempotency, alerting,
   restart during execution.
10. **Observability:** correlation IDs, redaction, readiness failures, build
    identity, audit-event completeness.
11. **Performance/resources:** agreed concurrency/data-volume baselines, memory,
    CPU, disk, database pool, job backlog, graceful shutdown.
12. **Recovery:** blind backup/restore, failure injection, application rollback,
    host reboot.

### Evidence format

For each track archive:

- command/test identifier and version;
- start/end time and environment/profile;
- source commit, image digest, SBOM/provenance digest;
- sanitized config fingerprint;
- pass/fail/blocked result;
- raw machine-readable output where safe;
- failure triage and retest link;
- reviewer and approval date.

### Certification rule

The first on-prem profile may move to **READY FOR CONTROLLED PRODUCTION** only if:

- no open P0/P1 security or recovery finding remains;
- all mandatory tracks pass on the exact signed artifact;
- rollback and restore pass;
- known P2/P3 items have explicit risk acceptance, owner, and expiry;
- documentation names the exact supported profile and exclusions.

### Exit criteria

- Every item in `audit/complete-verity-2026-09/14-untested-and-blocked.md`
  is either executed successfully or explicitly removed from a reduced product
  claim by an approved decision.
- Evidence is reproducible and bound to the release digest.

---

## 16. WP-10 — Industry Pack control plane

**Finding closed:** VCA-007.  
**Primary surfaces:** new pack manifest schema/registry/service/UI/CLI,
capability registry, configuration, roles, templates, audit history, Prisma
schema/migrations.  
**Size:** XL.  
**Depends on:** WP-04 and an Industry Pack ADR.

### Minimum viable pack contract

A pack is a signed/versioned declarative artifact, not a folder of seed code. Its
manifest must include at least:

- immutable pack key, semantic version, display metadata;
- compatible Verity platform range;
- required/optional capabilities and version constraints;
- dependency relationships and conflicts;
- versioned configuration schema/defaults;
- role and permission-set templates;
- dashboard, form, document, checklist, and workflow contributions by stable ID;
- preconditions, data migration hooks, and post-apply validations;
- publisher/signature/trust metadata;
- supported upgrade-from versions and rollback limits.

### Lifecycle

1. **Validate:** schema, signature, platform range, dependencies, conflicts,
   permissions, contribution IDs, migration availability.
2. **Preview:** deterministic desired-versus-current diff with warnings, impact,
   data changes, new permissions, irreversible steps, and rollback boundary.
3. **Approve:** authorized operator confirms exact manifest digest and diff.
4. **Apply atomically:** transaction or resumable state machine with durable
   operation ID; no half-configured tenant reported active.
5. **Verify:** activation/dependencies/config/roles/UI/templates/data invariants.
6. **Reapply:** same digest is idempotent.
7. **Upgrade:** delegated to WP-11A compatibility/migration contract.
8. **Rollback/remove:** only when dependency/data rules permit; preview impact;
   preserve append-only history.

### Data model concepts

- `PackRelease` — key/version/digest/schema/signature/platform range.
- `PackInstance` — tenant, desired/applied version, state, timestamps.
- `PackOperation` — preview/apply/upgrade/rollback state and immutable plan hash.
- `PackContribution` — stable contributed artifact identity and ownership.
- Append-only pack event/history record.

Exact names require schema design review; avoid duplicating existing activation
and configuration records.

### Security requirements

- Tenant-scoped operations under central authorization and audit.
- Pack cannot grant the acting operator more authority or bypass approval.
- No arbitrary SQL, shell, or unsandboxed server code in customer manifests.
- Every introduced route/action/query remains covered by WP-04 guards.
- Permission expansion is highlighted and separately approved.
- Signature and digest validated before preview and again before apply.

### Acceptance scenario

```text
empty tenant
-> import trusted sample pack
-> validate
-> preview exact changes
-> approve/apply
-> verify capabilities, dependencies, config, roles, UI, templates, and data
-> reapply same digest with zero changes
-> suspend one capability and prove all surfaces deny
-> upgrade pack under WP-11A
-> rollback within supported boundary
-> compare desired and actual state
```

### Exit criteria

- The scenario passes with zero direct SQL, seed edit, or core-code edit.
- Partial failure recovers or rolls back without false active state.
- Applied pack version and contribution inventory are queryable and audited.

---

## 17. WP-11A — Enforced capability compatibility and tenant upgrade lifecycle

**Finding closed:** VCA-008.  
**Primary surfaces:** `TenantActivation.pinnedVersion`, capability release
metadata, dependency resolver, upgrade service/UI/CLI, schema/data migrations,
audit history.  
**Size:** XL.  
**Depends on:** WP-04 and compatibility/versioning ADR; integrates with WP-10.

### Correct the semantic gap

`pinnedVersion` must become an enforced runtime contract, not display metadata.
Choose one honest model:

1. application supports multiple capability handler versions concurrently; or
2. pin represents a supported contract/data version within a platform build,
   with compatibility checked before execution.

Do not promise independent tenant code rollback if the deployment architecture
cannot deliver it.

### Implementation requirements

1. Define capability release metadata: key, version, platform range, dependency
   ranges, config schema version, data schema/migration version, handler contract.
2. Add compatibility resolver used by activation, request execution, pack
   preview/apply, deployment preflight, and readiness.
3. Add durable tenant upgrade state:
   `Planned -> Preflighted -> Applying -> Verifying -> Active`, plus failed and
   rollback-required states.
4. Create dry-run output for affected tenants, dependency conflicts, config/data
   changes, permission changes, downtime, and rollback boundary.
5. Make migration hooks idempotent, resumable, tenant-scoped, and audited. Global
   schema migrations must remain compatible with all tenants still allowed on
   the prior contract.
6. Prevent execution when recorded version and loaded handler/config/data
   contract are incompatible.
7. Add deployment preflight that enumerates every tenant incompatibility before
   production traffic changes.
8. Define rollback:
   - code/config-only rollback;
   - reversible tenant data migration;
   - irreversible boundary requiring backup/restore or forward fix.

### Tests

- tenant A old version, tenant B new version, same deployment;
- compatible and incompatible dependency ranges;
- failed tenant migration with another tenant unaffected;
- retry after interruption;
- stale worker executing old plan/digest;
- rollback before and after declared irreversible boundary;
- pack upgrade containing multiple dependent capabilities;
- audit/history reconstruction of who approved and what changed.

### Exit criteria

- Runtime enforces compatibility for every capability execution.
- Mixed-version tenants pass supported workflows or are blocked before deploy.
- Upgrade failure cannot create false `Active` state.
- Rollback limits are technically enforced and truthfully documented.

---

## 18. WP-11B — Constrained extensions, dashboard composition, and templates

**Finding closed:** VCA-009.  
**Primary surfaces:** new extension/contribution registry, dashboard composition,
custom fields/forms, document/checklist templates, permission and audit systems,
CSP/UI boundary.  
**Size:** XL.  
**Depends on:** WP-04, WP-11A, and extension trust-boundary ADR.

### Scope boundary

Implement the narrow declarative/package boundary already required by Verity's
specification. Do not build a general arbitrary-code plugin runtime in this work
package.

### Extension package contract

- immutable key/version/digest and publisher trust;
- compatible platform/capability ranges;
- owned contribution IDs and removal behavior;
- permissions/scopes requested;
- configuration schema/defaults and migrations;
- declarative navigation, page-panel, dashboard, form, document, checklist,
  workflow, and query-view contributions;
- CSP/resource declaration for any reviewed client asset;
- install/upgrade/remove hooks limited to supported platform operations;
- audit and provenance metadata.

### Dashboard composition

1. Define stable widget/panel contract with data query ID, permission, capability
   owner, loading/empty/attention/degraded/error states, size constraints, and
   performance budget.
2. Resolve dashboard per tenant/role from active compatible contributions.
3. Execute data through registered scoped queries; never allow raw client SQL.
4. Isolate panel failure so one contribution does not crash the whole dashboard.
5. Enforce deterministic ordering and collision handling.

### Dynamic forms and configuration

1. Version form schemas and submissions.
2. Define supported field types, validation, conditional visibility, option
   sources, permission/redaction, accessibility, and localization.
3. Migrate existing narrow dynamic-form behavior into the shared contract only
   after parity tests.
4. Reject unknown fields/types and incompatible schema versions fail closed.

### Document and checklist templates

1. Versioned template registry with tenant/pack/extension ownership.
2. Safe placeholder allowlist and typed input binding; no arbitrary expression or
   server execution.
3. Document rendering/version history and immutable reference to the template
   version used.
4. Checklist steps with assignment, evidence, completion rules, audit history,
   and version behavior for in-flight instances.

### Security and lifecycle tests

- install untrusted/wrong-signature/incompatible package denied;
- package cannot escape tenant, permission, or capability scope;
- dangerous HTML/URL/script/style contribution rejected under CSP;
- install, idempotent reapply, compatible upgrade, failed upgrade, rollback,
  disable, and remove;
- removal does not orphan required history or silently delete client data;
- sample extension adds UI/config/template behavior without a core source diff;
- disabled/suspended owner capability removes and denies every contribution;
- accessibility, localization, performance, and failure-isolation baselines.

### Exit criteria

- A sample signed extension completes the full lifecycle without core changes.
- Dashboard/forms/documents/checklists are driven by versioned contributions.
- Security, tenant isolation, CSP, audit, and upgrade guarantees pass.
- The platform has a truthful, bounded extension promise.

---

## 19. WP-12 — Documentation reconciliation and final certification

**Finding closed:** VCA-021.  
**Primary surfaces:** `verity-bible/`, `verity-spec/`, `implementation/`, deploy
docs/runbooks, `taskplans/00_STATUS_INDEX.md`, client documents, release notes,
audit/remediation evidence.  
**Size:** L.  
**Depends on:** every work package whose outcome is claimed.

### Documentation pass

1. Re-read authority in order and record unresolved contradictions. Do not infer
   canonical resolution from a clean worktree or old walkthrough.
2. Update the status index from current code, migrations, test evidence, and
   accepted decisions.
3. Enumerate every client-specific document, including plywood, Kent's clinic,
   restaurant/client vertical documents, and any newer client bundles.
4. For every client/capability statement label:
   - built;
   - partial;
   - planned;
   - demonstrated on a named fixture/profile;
   - target only.
5. Replace generic on-prem wording with the exact certified profile, identity
   option, PostgreSQL version, storage driver, topology, resource baseline, and
   exclusions.
6. Reconcile scripts and runbooks so operators never face two contradictory
   installation, backup, restore, or upgrade procedures.
7. Bind every readiness/security/modularity statement to:
   - source commit;
   - signed image digest;
   - profile/config fingerprint;
   - evidence record and date;
   - known limitations and expiry/retest trigger.
8. Mark superseded historical plans as historical without rewriting their
   original evidence.
9. Run a repository-wide contradiction and overclaim scan for phrases such as
   production-ready, enterprise-ready, complete, certified, all green, on-prem,
   air-gapped, HA, OIDC, pack, extension, and version pinning.

### Final verdict rules

| Verdict | Minimum required state |
|---|---|
| Security ready | WP-01–WP-05 and applicable WP-09 security tracks pass; no open P0/P1 security finding |
| First on-prem profile ready | WP-01–WP-09 pass on exact signed artifact/profile; restore and upgrade rollback proven |
| Named client bundle demonstrated | Its deterministic business and isolation dossier passes; no extrapolation to other clients |
| Complete modular platform | WP-04, WP-10, WP-11A, WP-11B and full capability conformance pass |
| HA or air-gapped ready | Separate architecture, threat model, operations, recovery, and acceptance program passes |

### Exit criteria

- No current certification relies solely on historical evidence.
- No contradiction remains between runtime behavior, deployment package, spec,
  client claims, and task status.
- Final audit closure matrix is independently reviewable.

---

## 20. Cross-cutting test catalogue

Every work package selects its applicable rows; WP-09 executes the complete set.

### Authentication and session

- missing, malformed, expired, not-yet-valid, wrong-issuer, wrong-audience token;
- session fixation, replay, cookie tampering, signing-key rotation;
- logout, deactivation, membership removal, tenant switch;
- recovery enumeration, expiry, tampering, reuse;
- public probe versus protected route separation.

### Authorization, tenancy, and capability state

- tenant A/B read/create/update/delete and indirect-reference attacks;
- user, role, permission, scope, field redaction, export and batch paths;
- absent/active/suspended/dependency-missing capability;
- direct URL, API, Server Action, registered query/command, upload, scheduled job,
  agent tool, dashboard contribution;
- stale authorization/capability state during concurrent suspension.

### Input, files, and external calls

- schema boundary, oversized body, duplicate key, Unicode/normalization edge;
- file MIME/signature mismatch, size, traversal, overwrite, unauthorized object;
- SSRF, redirect chain, hostname allowlist, private-network target, hostile image;
- prompt/tool input cannot bypass tenant, permission, confirmation, or audit.

### Data and recovery

- runtime DB role properties and RLS enforcement;
- function ACL/search-path matrix;
- migration from last supported release and fresh database;
- backup pair consistency, corrupt/missing artifact, restore quarantine;
- application/schema rollback compatibility;
- schedules resume once without duplicate business effects.

### Operations and supply chain

- clean build from lock, exact runtime versions, SBOM, signature, digest;
- fresh install, reboot, upgrade, rollback, secret rotation;
- dependency/IdP/storage/database/scheduler failure readiness;
- graceful shutdown, concurrency/resource baseline, disk/log bounds;
- secret/PII/log redaction and audit completeness.

---

## 21. Migration and rollout discipline

1. Use expand/migrate/contract for schema changes when mixed application versions
   may coexist.
2. Run migration preflight using the privileged tools path only.
3. Capture backup and migration checksum set before change.
4. Test every migration on:
   - empty database;
   - production-shaped anonymized dataset;
   - last supported release state;
   - failure/retry path.
5. Never edit an applied migration. Add a corrective migration.
6. Mark irreversible steps and the last rollback point in preview and release
   notes.
7. Deploy in a controlled ring:
   - disposable lab;
   - internal/non-production tenant;
   - controlled pilot profile;
   - broader supported installations.
8. Define automatic halt signals: readiness failure, isolation failure, auth
   failure rate, migration mismatch, scheduler backlog, restore quarantine,
   data-integrity mismatch, or unverified artifact.
9. Do not use database superuser access or disabled guards as an emergency
   application workaround.

---

## 22. Evidence and closure record template

Create one file per finding under the remediation evidence directory:

```markdown
# VCA-### Closure Record

- Finding and severity:
- Starting commit:
- Remediation commit(s):
- Reviewed artifact digest:
- Supported profile:
- Changed surfaces:
- Security invariants reviewed:
- Positive tests:
- Negative/adversarial tests:
- Deployment test:
- Recovery/rollback test where applicable:
- Raw evidence links:
- Residual risk:
- Reviewer:
- Decision: OPEN | PARTIAL | CLOSED | RISK-ACCEPTED
- Decision date and retest trigger:
```

`PARTIAL` is required when code exists but deployment/recovery/adversarial proof
does not. `RISK-ACCEPTED` requires a named owner, business rationale, expiry, and
cannot be used for unresolved P0/P1 in a production certification.

---

## 23. Program completion checklist

### Security and release

- [ ] VCA-001 through VCA-006 and VCA-010/VCA-011 are closed with current proof.
- [ ] Web and scheduler cannot access `DIRECT_URL`.
- [ ] Runtime role is proven `NOSUPERUSER NOBYPASSRLS`.
- [ ] Active capability enforcement covers every execution plane.
- [ ] Full browser identity and account lifecycle works for the selected profile.
- [ ] Patched dependencies and exact runtime versions are enforced from clean install.
- [ ] No open P0/P1 security finding remains.

### On-premises operations

- [ ] Fresh install, restart, upgrade, and rollback pass on the supported host.
- [ ] Scheduler runs every cadence with lock/retry/alert behavior.
- [ ] Readiness reflects all required profile dependencies.
- [ ] Restore fails closed and blind recovery meets measured RPO/RTO.
- [ ] Release digest, signature, SBOM, and provenance are verified.
- [ ] Resource, observability, secret rotation, and support runbooks pass operator review.

### Modular completion

- [ ] Industry Pack validate/preview/apply/reapply/upgrade/rollback works.
- [ ] Capability versions and compatibility are enforced at runtime.
- [ ] Extension lifecycle works without a core diff or arbitrary trusted code.
- [ ] Dashboard, form, document, and checklist contributions are versioned and guarded.
- [ ] All 20 capabilities pass their implementation/reusability conformance matrix.
- [ ] Empty tenant can be configured and evolved through supported control-plane operations.

### Documentation and certification

- [ ] All 21 closure records are complete.
- [ ] Client documents distinguish built, partial, planned, demonstrated, and target.
- [ ] Current status index and runbooks match code and deployment behavior.
- [ ] Every certification binds exact commit, digest, profile, evidence, date, and limitations.
- [ ] Independent reviewer signs the final closure matrix.

---

## 24. Recommended execution increments

Keep reviews small even though the program is large:

1. CI YAML and fixtures only.
2. Clean-install/version assertions and Vitest patch only.
3. Remote-image policy only.
4. Remove web `DIRECT_URL` and rotate credentials.
5. Function ACL migration and privilege tests.
6. Capability inventory and guard contract.
7. Capability route/API/action migrations in bounded batches.
8. Identity ADR, then protocol core, then account lifecycle UI.
9. Config contract and installer state machine.
10. Scheduler service and telemetry.
11. Readiness expansion and expected-denial logging.
12. Backup contract, fail-closed restore, then full recovery rehearsal.
13. Image immutability, SBOM, signing, and verified installer.
14. Full isolated-lab certification.
15. Industry Pack ADR/data model, then preview/apply lifecycle.
16. Capability compatibility/upgrade lifecycle.
17. Declarative extension and contribution primitives.
18. Dashboard/form/document/checklist composition.
19. Full modular conformance certification.
20. Documentation authority and final verdict pass.

Each increment receives its own tests and closure evidence. Do not defer all
verification to the end.

---

## 25. Expected final outcome

The program is complete only when the repository can truthfully demonstrate:

1. a reproducible, signed, patched release built from a clean environment;
2. fail-closed authentication, authorization, tenancy, RLS, and active-capability
   enforcement on every execution plane;
3. one precisely defined on-premises profile that installs, operates, upgrades,
   backs up, restores, and rolls back under evidence;
4. a real modular control plane for packs, compatibility, upgrades, extensions,
   dashboard contributions, forms, documents, and checklists;
5. current documentation and certifications bound to the exact artifact and
   profile tested.

Until the applicable gates pass, the existing audit verdict remains in force.
