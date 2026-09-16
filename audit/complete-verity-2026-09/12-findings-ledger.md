# Canonical Findings Ledger

Snapshot for every finding: `main@2a71102e3489231227613d1b5c1115f82c55fec3`, audit host plus stated live/clean environment.

## VCA-001 — The required verification workflow is invalid and never starts

- Severity: **P1**
- Workstream: Cross-cutting
- Status: Corrected in code; fresh GitHub Actions proof pending
- Surface: `.github/workflows/verify.yml`
- Authority: `implementation/13-conformance/release-gates.md`; workflow's own reproducibility contract
- Evidence: E-CI-01; duplicate `NEXT_PUBLIC_SUPABASE_URL` at lines 41/52 and anon key at 42/53; GitHub annotates the workflow invalid.
- Preconditions: Any push or pull request using the workflow.
- Reproduction/verification: Open the public Actions run for commit `2a71102`; GitHub reports duplicate mapping keys and creates no job.
- Observed: Current commit is red before checkout, install, RLS proof, tests, or build.
- Expected: A syntactically valid required workflow executes every release gate on an isolated DB.
- Impact: No reproducible security, isolation, regression, or build evidence protects releases.
- Scope: All branches/PRs since the duplicate keys landed.
- Attack/failure path: A defective or malicious change is merged/deployed because the nominal control cannot execute; historical green claims mask absence of current proof.
- Detection and auditability: Visible as failed Actions runs, but easy to misread as a test failure rather than a missing control.
- Suggested direction: Deduplicate provider variables, validate workflow syntax, require the job on protected branches.
- Retest gate: Successful fresh run completing role creation, migrations, RLS proof, typecheck, lint, full tests, and build.

## VCA-002 — The enterprise web container receives the migration superuser URL

- Severity: **P1**
- Workstream: Security / On-prem operations
- Status: Confirmed
- Surface: `deploy/compose/docker-compose.yml:109-110`
- Authority: runtime/migration identity separation in `config.ts`, deploy docs, and CI
- Evidence: Web environment includes `DATABASE_URL=verity_app...` and `DIRECT_URL=postgres...`; tools also appropriately receives both.
- Preconditions: Deploy the supplied enterprise Compose profile and compromise/read the web process environment.
- Reproduction/verification: Inspect the rendered web service environment with values redacted.
- Observed: Web has the PostgreSQL superuser credential even though application traffic does not need it.
- Expected: Only the one-shot migration/tools service can access `DIRECT_URL`; web has only the NOBYPASSRLS runtime role.
- Impact: Application RCE or secret disclosure becomes full database takeover, RLS bypass, tenant data compromise, and destructive restore/migration capability.
- Scope: All installations using this Compose file.
- Attack/failure path: unauthenticated/app-layer compromise -> process env -> `DIRECT_URL` -> connect as `postgres` -> bypass/drop RLS and read/change every tenant.
- Detection and auditability: Database logs may show postgres activity but cannot distinguish stolen legitimate credentials without dedicated monitoring.
- Suggested direction: Remove `DIRECT_URL` from web; run migrations through a separately invoked, non-running tools job; rotate exposed DB superuser secrets.
- Retest gate: Container inspection proves web cannot read `DIRECT_URL`; app works; migrations work only in tools; hostile app-role RLS tests pass.

## VCA-003 — OIDC is a verifier, not a usable browser authentication replacement

- Severity: **P1**
- Workstream: Security / On-prem operations
- Status: Implemented in code; fresh IdP/browser proof pending
- Surface: `auth.ts`, sign-in routes/actions, deployment OIDC profile
- Authority: provider portability claims; Task 36 explicitly records its excluded browser flow
- Evidence: OIDC reads bearer header or `verity_oidc_id_token`; no code sets the cookie; no callback/login route; sign-in/user lifecycle actions call Supabase.
- Preconditions: Configure `VERITY_AUTH_PROVIDER=oidc` for interactive on-prem users.
- Reproduction/verification: Build route inventory and search all cookie/auth writers.
- Observed: Browser users have no authorization-code/PKCE entry/callback, while password/team-login/reset operations require Supabase APIs.
- Expected: End-to-end interactive login, logout, session renewal, provisioning/deprovisioning, and recovery for the selected provider.
- Impact: Customer-controlled identity deployments strand browser users or require undocumented external glue; provider independence is overstated.
- Scope: Every interactive OIDC deployment; bearer API verification remains usable.
- Attack/failure path: Operator disables Supabase expecting OIDC parity -> no browser session can be established -> administrative and operational outage; ad-hoc proxy cookie injection creates an unreviewed security boundary.
- Detection and auditability: Preflight validates settings, not login capability; readiness stays green.
- Suggested direction: Implement standards-compliant authorization code + PKCE, callback/state/nonce, secure cookie rotation/logout, and provider-neutral identity lifecycle, or label OIDC bearer-only.
- Retest gate: Fresh on-prem IdP lab completes login, renewal, logout, unknown-user denial, provisioning, recovery, and tenant-switch audit scenarios.
- Corrective work (2026-09-16): ADR-020 selects a complete browser OIDC profile. The application now provides authorization-code plus PKCE start/callback routes, signed state and nonce transactions, an atomic database replay ledger, strict discovery/token verification, pre-provisioned membership binding, bounded local sessions with renewal, and provider logout. Unit/static gates pass; the retest gate remains open until exercised against a fresh IdP in a browser.

## VCA-004 — Restore automation converts database errors into apparent success

- Severity: **P1**
- Workstream: On-prem operations
- Status: Corrected in code; blind database-plus-object rehearsal pending
- Surface: `deploy/scripts/restore.sh`, backup/restore runbook, `/api/ready`
- Authority: release/recovery integrity; runbook's own fail-on-error rule
- Evidence: `pg_restore ... || warn`, followed by restart, DB-only health check, and `restore complete`; runbook describes a different data-only migrate-first process.
- Preconditions: Any restore with one or more pg_restore errors while PostgreSQL remains reachable.
- Reproduction/verification: Static trace; no destructive live restore performed.
- Observed: Non-zero restore does not terminate the script.
- Expected: Any unapproved restore error aborts; post-restore verification proves data/schema/security/object integrity.
- Impact: Partial/corrupt recovery can be declared complete during disaster recovery or rollback.
- Scope: Scripted restores and upgrade rollback relying on them.
- Attack/failure path: failed upgrade/data loss -> restore -> trigger/order/ownership error -> warning ignored -> SELECT 1 passes -> damaged system returned to service.
- Detection and auditability: Error exists in console output but final success message and readiness status contradict it.
- Suggested direction: Choose one supported backup contract, use strict exit handling, verify checksums/counts/migrations/RLS/grants/triggers/files and refuse traffic on mismatch.
- Retest gate: Injected restore error fails closed; full destroy-and-restore rehearsal passes application and isolation checks.
- Corrective work (2026-09-16): script and runbook now select one full PostgreSQL 16 logical contract. Backup writes an atomically completed, readable, checksummed archive plus manifest. Restore verifies before destruction, stops web and scheduler, uses `--exit-on-error`, marks quarantine, validates role/RLS/constraints/migrations/timezone/tenant count, and only then releases services. Object-store export/restore and the blind failure-injection matrix remain open, so recovery is not certified.

## VCA-005 — On-prem deployments have no scheduler binding

- Severity: **P1**
- Workstream: On-prem operations
- Status: Implemented in code; fresh Compose cadence proof pending
- Surface: Compose/deploy scripts versus `vercel.json` and GitHub scheduled workflow
- Authority: ADR-015/016 scheduled-work contract and capability schedule contributions
- Evidence: Vercel daily and GitHub frequent/hourly/weekly callers exist; no Compose scheduler, systemd timer, cron install, or on-prem runbook.
- Preconditions: Deploy outside Vercel/GitHub scheduler integration.
- Reproduction/verification: Inventory services and operations docs.
- Observed: `/api/scheduled` exists and is secret-protected, but nothing in on-prem package calls it.
- Expected: Durable, observable local schedule for every declared cadence with overlap control and retries.
- Impact: SLA sweeps, notifications, snapshots and other scheduled business behavior silently do not happen.
- Scope: All standalone on-prem profiles.
- Attack/failure path: installation reports healthy -> no scheduler calls -> deadlines/jobs accumulate or never materialize -> operational commitments fail without application outage.
- Detection and auditability: Metrics exist only if scraped; no packaged “last successful cadence” alert.
- Suggested direction: Add a supported local scheduler/worker with secrets, locking, retry/backoff, outcome monitoring and documented timezone behavior.
- Retest gate: Fresh install runs every cadence, records outcomes, prevents overlap, retries transient failures, and alerts on sustained failure.
- Corrective work (2026-09-16): Compose now packages a credential-minimal scheduler sidecar for frequent/hourly/daily/weekly UTC boundaries. The authenticated endpoint acquires database leases, stores attempts and outcomes, and readiness fails when the frequent success heartbeat is stale. The sidecar applies bounded retry with jitter; fresh Compose execution remains the closure gate.

## VCA-006 — Direct page reads bypass active-capability enforcement

- Severity: **P1**
- Workstream: Security / Modular completion
- Status: Confirmed
- Surface: capability-owned Server Component routes using `withTenant` + Prisma
- Authority: Module Catalog activation/suspension semantics; command/query chokepoint
- Evidence: `command.ts`/`query.ts` call `requireCapabilityActive`; pages such as locations/assets/outreach query directly after permission checks; shell composition only hides navigation.
- Preconditions: User retains a role permission and knows/bookmarks a capability URL after suspension.
- Reproduction/verification: Suspend capability in isolated lab, then request direct route with existing session; current live mutation not attempted.
- Observed: Static control flow contains no page-level activation denial.
- Expected: Suspension removes navigation **and** denies all UI/read/write/API execution surfaces.
- Impact: Entitlement, emergency-disable, and client-module isolation semantics are incomplete; suspended data can remain visible.
- Scope: Direct-read capability pages; registered commands/queries remain gated.
- Attack/failure path: admin suspends compromised/unlicensed module -> user requests saved URL -> Server Component reads tenant rows directly -> module remains operational/readable.
- Detection and auditability: Direct reads do not necessarily emit a module-denial event because no denial occurs.
- Suggested direction: Add one route/layout guard keyed to capability ownership and migrate capability reads through registered queries where practical.
- Retest gate: Matrix test for every capability route/API/action under absent, Active, Suspended, and dependency-missing states.

## VCA-007 — Industry Pack is specification-only

- Severity: **P1**
- Workstream: Modular completion
- Status: Confirmed
- Surface: Client System / Pack plane
- Authority: Bible V1 and `verity-spec/01_platform/packs.md`
- Evidence: No pack manifest schema, registry, dependency solver, atomic activation, defaults/templates/roles payload, UI, CLI, or tests.
- Preconditions: Claim or attempt vertical onboarding through an Industry Pack.
- Reproduction/verification: Repository symbol/file inventory for required manifest fields and pack operations.
- Observed: Client docs explicitly frame current verticals as capabilities, not packs.
- Expected: Versioned declarative pack manifests compose capabilities/config/roles/templates with validate/preview/apply/rollback.
- Impact: “Complete modular platform” and rapid repeatable vertical provisioning cannot be demonstrated.
- Scope: All vertical/client systems.
- Attack/failure path: operator manually assembles an intended pack -> misses dependency/config/role/template -> inconsistent tenant security/behavior with no atomic rollback.
- Detection and auditability: No pack instance/version record exists to compare desired and actual state.
- Suggested direction: Implement minimal signed/versioned manifest and idempotent preview/apply transaction before marketing pack completeness.
- Retest gate: Empty tenant -> pack preview -> atomic activation -> expected UI/data/roles -> idempotent reapply -> rollback/upgrade proof.

## VCA-008 — Capability version pinning has no upgrade or compatibility runtime

- Severity: **P1**
- Workstream: Modular completion
- Status: Confirmed
- Surface: `TenantActivation.pinnedVersion`, capability release lifecycle
- Authority: `verity-spec/01_platform/versioning.md`
- Evidence: Version stored/displayed at activation; no compatibility resolver, upgrade command, migration registry, dry-run, rollback, or mixed-version tests.
- Preconditions: Release a capability version that changes schema/config/contracts while tenants are pinned.
- Reproduction/verification: Search version/pinnedVersion write/read paths and upgrade operations.
- Observed: Application deploy upgrades code globally regardless of tenant pin; pin is descriptive.
- Expected: Enforced compatibility and authorized tenant-aware upgrade lifecycle.
- Impact: Tenant-specific rollout/rollback promises are false; schema/code drift can break clients together.
- Scope: All capabilities and tenants.
- Attack/failure path: deploy new code -> old pinned tenant executes incompatible handler/schema/config -> corruption/outage; recorded pin gives false assurance.
- Detection and auditability: Version is visible but not compared, so mismatch is not reliably detected.
- Suggested direction: Define supported version ranges, migration hooks, preflight, tenant upgrade state, audit events, rollback constraints.
- Retest gate: Mixed tenants pinned to old/new versions survive upgrade, failure, rollback, and dependency compatibility tests.

## VCA-009 — Client extensions, dashboard composition, and operational templates are incomplete

- Severity: **P1**
- Workstream: Modular completion
- Status: Confirmed
- Surface: Client Configuration/Extensions plane
- Authority: client-systems, configuration, extension and implementation contracts
- Evidence: no `src/extensions`; no generic dashboard contribution; no `DocumentTemplate`; no general checklist template plane; dynamic forms are demonstrated narrowly.
- Preconditions: A client requirement cannot be expressed by an existing hard-coded capability.
- Reproduction/verification: Required-symbol/directory/model inventory.
- Observed: Change requires capability/application code or free-form config rather than a packaged, versioned extension/config artifact.
- Expected: Stable extension hooks, versioning, UI injection boundary, templates and metadata-driven presentation under security controls.
- Impact: Client-specific work risks forks/core edits and cannot meet the complete modularity promise.
- Scope: All future client customization beyond current fields/config.
- Attack/failure path: bespoke change bypasses central guards/upgrade contract -> tenant-specific security drift or broken upgrades.
- Detection and auditability: No extension inventory/version/permission manifest exists.
- Suggested direction: Narrowly implement the already-specified extension/package boundary and template primitives; avoid general arbitrary code execution.
- Retest gate: Install/remove/upgrade a sample extension without core diff; prove guards, audit, CSP, tenant isolation and UI composition.

## VCA-010 — Full enterprise and on-prem acceptance evidence is unavailable

- Severity: **P1**
- Workstream: Cross-cutting
- Status: Confirmed
- Surface: test environment, Docker lab, e2e/recovery tracks
- Authority: implementation release gates and this audit prompt
- Evidence: normal suite rejects remote DB; Docker/psql absent; CI invalid; Playwright and recovery not run.
- Preconditions: Any readiness/certification claim at this snapshot.
- Reproduction/verification: Run normal suite without unsafe override; it aborts before collection.
- Observed: Strong static/pure/catalog evidence but no current cross-tenant mutation, clean-cluster, container, e2e, backup/restore, or failure-recovery proof.
- Expected: Reproducible isolated lab and green mandatory gates.
- Impact: Unknown defects remain in the highest-risk boundaries; “deploy tomorrow” cannot be justified.
- Scope: Security, data integrity, all capability business chains, on-prem operations.
- Attack/failure path: release relies on stale historical proof -> current schema/code/deploy drift reaches production -> failure discovered on customer data.
- Detection and auditability: Gaps are now explicit in files 11 and 14; prior status documents obscure them.
- Suggested direction: Restore CI first, then provision ephemeral local PostgreSQL/S3/IdP and run the complete tracks.
- Retest gate: All items in `14-untested-and-blocked.md` executed and archived with exact artifact digest.

## VCA-011 — The audited working runtime is a stale critically affected Next.js installation

- Severity: **P1**
- Workstream: Security / Supply chain
- Status: Confirmed with bounded scope
- Surface: local `node_modules`, local production build/runtime
- Authority: lockfile integrity and official Next.js advisories
- Evidence: manifest/lock 16.3.3; installed/runtime 16.2.10; clean install 16.3.3; official AVIF RCE/source disclosure ranges.
- Preconditions: Expose a build made from the current working `node_modules`; AVIF optimizer path additionally requires attacker-controlled acceptable remote URL.
- Reproduction/verification: `npm ls`; build banner; local start banner.
- Observed: Workspace build and server report 16.2.10. `*.supabase.co` remote pattern accepts attacker-owned public Supabase storage URLs.
- Expected: Build environment exactly matches lock and patched release.
- Impact: Potential unauthenticated RCE/source disclosure on a carelessly exposed local/host build; audit/runtime evidence does not describe committed artifact.
- Scope: Current workspace-derived artifacts. Clean `npm ci` artifact is 16.3.3 and not affected by these ranges.
- Attack/failure path: deploy without clean install -> request optimizer for malicious AVIF on attacker Supabase host -> vulnerable native path -> app-process compromise; VCA-002 then escalates to DB superuser in Compose.
- Detection and auditability: `npm ls` reports invalid tree, but build still succeeds and can be mistaken for safe.
- Suggested direction: discard stale install, enforce `npm ci`, assert exact version in CI/artifact metadata, narrow remote image host to configured project.
- Retest gate: deployed digest reports patched Next; hostile image URL rejected; advisory regression checks pass.

## VCA-012 — Password recovery link points to a nonexistent route

- Severity: **P2**
- Workstream: Security / Product operations
- Status: Corrected in code; browser proof pending
- Surface: `/sign-in` -> `/reset-password`
- Authority: usable account lifecycle
- Evidence: link at `SignInForm.tsx:105`; no route in source or clean build route manifest.
- Preconditions: User selects “Forgot password?”.
- Reproduction/verification: route inventory or unauthenticated browser navigation.
- Observed: Link targets a 404 route.
- Expected: Secure recovery flow or no misleading link.
- Impact: Locked-out users depend on privileged tenant-admin resets; incident recovery and access continuity degrade.
- Scope: Supabase browser users; OIDC lifecycle is separately incomplete.
- Suggested direction: Implement provider-appropriate recovery with enumeration resistance and audit, or remove the link until supported.
- Retest gate: End-to-end recovery with expired/tampered/reused token cases and no account oracle.
- Corrective work (2026-09-16): OIDC sign-in now exposes only organization-managed recovery guidance and never links to the absent Supabase reset route. Supabase remains the password/recovery provider for its own profile. Provider-specific browser verification remains required before closure.

## VCA-013 — Current test fixtures conflict with tightened production validation/configuration

- Severity: **P2**
- Workstream: Cross-cutting
- Status: Confirmed
- Surface: import and configuration tests
- Authority: green release gates without weakening security
- Evidence: pure slice 117/118; invalid GSTIN expected valid. Positive config tests omit mandatory private session secret and fail.
- Preconditions: CI is repaired and reaches tests, or pure tests run independently.
- Reproduction/verification: E-TEST-02 and audit-only broader run.
- Observed: Tests fail for stale fixtures, while production code correctly fails closed.
- Expected: Fixtures satisfy current security/business invariants.
- Impact: CI will remain red after YAML repair or pressure may arise to weaken validators.
- Scope: At least import and config suites.
- Suggested direction: Replace fixture with independently verified valid GSTIN; add private test signing secret to positive config fixtures.
- Retest gate: Tests green with unchanged fail-closed production guards.

## VCA-014 — Vitest development server dependency permits arbitrary file reads when exposed

- Severity: **P2**
- Workstream: Supply chain
- Status: Confirmed
- Surface: `vitest`/`@vitest/mocker` 4.1.10
- Authority: dependency vulnerability policy
- Evidence: `npm audit`; GHSA-82fw-gwwq-j7x9, fixed 4.1.11.
- Preconditions: Affected public mocker/interceptor plugin or development server WebSocket is reachable.
- Reproduction/verification: dependency tree plus official advisory.
- Observed: Affected version is locked.
- Expected: Patched supported test toolchain.
- Impact: Local files/secrets may be read from an exposed dev service; no production integrity impact from the package itself.
- Scope: development/test environments, not production runtime dependency.
- Suggested direction: Narrow update to Vitest 4.1.11+ and lockfile, then run full regression.
- Retest gate: audit clean for advisory and all test/deploy gates pass.

## VCA-015 — Deployment images and releases are mutable and lack provenance controls

- Severity: **P2**
- Workstream: On-prem operations / Supply chain
- Status: Confirmed
- Surface: Dockerfile/Compose/upgrade flow
- Authority: repeatable enterprise deployment
- Evidence: `node:20-bookworm-slim`, `postgres:16-alpine`, `minio:latest`; no digest, SBOM, signature, or scan gate.
- Preconditions: Registry tag changes or upstream compromise/drift between installs.
- Reproduction/verification: inspect FROM/image references and release assets.
- Observed: Same deployment instructions can pull different bytes.
- Expected: tested immutable digests and artifact provenance.
- Impact: Non-reproducible installs, surprise upgrades, difficult incident attribution/rollback.
- Scope: all container deployments.
- Suggested direction: pin digests, scan, sign, produce SBOM/attestation, document update cadence.
- Retest gate: rebuild from recorded digests yields verified artifact and passes acceptance.

## VCA-016 — Environment documentation and live operator configuration have drifted

- Severity: **P2**
- Workstream: On-prem operations
- Status: Corrected in templates; supported-profile boot proof pending
- Surface: `.env.example`, `config.ts`, local ignored env, deploy template
- Authority: runtime configuration boundary
- Evidence: example says `OPENAI_*` unused while code reads them; local env contains legacy `S3_*`, code reads `VERITY_S3_*`; deploy template is newer.
- Preconditions: Operator follows root example or reuses legacy environment.
- Reproduction/verification: compare variable names only; no values read.
- Observed: Features can be silently unbound or misconfigured.
- Expected: One generated/validated configuration contract with provider-specific examples.
- Impact: AI/storage/auth availability differs from operator expectation; readiness may remain green.
- Scope: non-Compose and legacy deployments especially.
- Suggested direction: generate examples/docs from config schema and add “unknown legacy variable” preflight warnings.
- Retest gate: every supported profile boots from its documented template and provider checks pass.
- Corrective work (2026-09-16): root and deployment templates now name the current OIDC, `VERITY_S3_*`, scheduler, private session, and OpenAI-compatible variables. Preflight validates the selected deployment profile. Template generation from the typed schema remains future hardening; both documented profiles still require fresh boot proof.

## VCA-017 — First-run installer executes preflight before required provider configuration is supplied

- Severity: **P2**
- Workstream: On-prem operations
- Status: Corrected in code; fresh-host proof pending
- Surface: `deploy/scripts/install.sh`, install guide, env template
- Authority: idempotent one-command installation claim
- Evidence: template has blank required Supabase fields; install copies it then runs preflight; guide tells user to edit afterward/rerun.
- Preconditions: Fresh default installation.
- Reproduction/verification: static install sequence.
- Observed: The described first run cannot reach build/migrate/start without manual interruption.
- Expected: Installer pauses before preflight with actionable configuration step, or collects a complete supported profile first.
- Impact: confusing partial installs and operator workarounds around security preflight.
- Scope: default fresh on-prem install.
- Suggested direction: explicit two-phase init/configure/install or profile-aware interactive/noninteractive inputs.
- Retest gate: fresh VM follows docs once, without bypasses, and produces healthy service.
- Corrective work (2026-09-16): first run now creates the mode-0600 secret-bearing configuration and exits before starting services; the documented second run resumes at profile validation and then builds, migrates, bootstraps, starts web plus scheduler, and verifies health. Fresh-host evidence remains required.

## VCA-018 — Readiness can be green while required product dependencies and restored data are unusable

- Severity: **P2**
- Workstream: On-prem operations
- Status: Corrected in code; dependency-failure matrix pending
- Surface: `/api/ready`
- Authority: operational readiness and recovery gates
- Evidence: endpoint probes only `SELECT 1`; local response 200 despite untested auth/storage/scheduler; restore uses it as success proof.
- Preconditions: DB reachable while auth, required storage, scheduler, migrations/data, or external provider is broken.
- Reproduction/verification: inspect endpoint and restore caller.
- Observed: Green readiness expresses DB reachability only.
- Expected: Separate clearly named probes and deployment gates for all dependencies required by the selected profile/capabilities.
- Impact: load balancer returns traffic to a functionally broken or partially restored service.
- Scope: all deployments; optional dependencies must remain profile-aware.
- Suggested direction: retain liveness, add migration/schema and configured-required dependency readiness plus deeper post-restore verification.
- Retest gate: each dependency failure produces the documented signal without breaking deliberately optional profiles.
- Corrective work (2026-09-16): readiness now reports stable redacted checks for database, expected schema sentinel, RLS enforceability, selected identity reachability, configured object storage, scheduler freshness, restore quarantine, signing-secret strength, and privileged-URL absence. Optional unconfigured storage is reported as skipped, not falsely healthy. Live failure injection remains required.

## VCA-019 — SECURITY DEFINER execute grants rely on schema-USAGE isolation instead of least-privilege function ACLs

- Severity: **P3**
- Workstream: Security
- Status: Confirmed hardening gap
- Surface: `verity` SECURITY DEFINER functions
- Authority: least privilege
- Evidence: most functions show PUBLIC execute; PUBLIC has no `verity` schema usage, but multiple administrative/read-all roles do; `consume_request_quota` is explicitly restricted.
- Preconditions: A role receives `verity` schema USAGE but should call only a subset of functions.
- Reproduction/verification: E-DB-01 ACL metadata.
- Observed: That role inherits execute on all PUBLIC-granted definer functions, including credential functions.
- Expected: Revoke default PUBLIC execute and grant each function only to intended roles.
- Impact: Future role/schema grants can unintentionally broaden privileged operations.
- Scope: 13 of 14 observed SECURITY DEFINER functions; individual function checks may still fail closed.
- Suggested direction: Explicit ACL migration plus function-level authorization review; keep pinned search paths and no schema CREATE.
- Retest gate: privilege matrix proves only intended principals can execute each function.

## VCA-020 — Expected unauthenticated navigation is logged as server errors with stack traces

- Severity: **P3**
- Workstream: Security / Operations
- Status: Confirmed
- Surface: protected Server Components and structured logging
- Authority: signal quality and sensitive-log minimization
- Evidence: local root/config/HQ probes emitted `E_UNAUTHENTICATED`/`E_FORBIDDEN` exception stacks and filesystem paths while clients were redirected/denied.
- Preconditions: Ordinary unauthenticated request to protected page.
- Reproduction/verification: E-RUN-01 server output.
- Observed: Expected control-flow denial appears at error severity.
- Expected: clean redirect/deny telemetry without stack unless anomalous.
- Impact: alert fatigue, log cost, and unnecessary source-path disclosure to log readers.
- Scope: protected page navigation; HTTP responses did not expose stack.
- Suggested direction: model expected auth outcomes without exception-error capture; keep security event/count.
- Retest gate: unauth probes yield correct HTTP behavior and structured non-stack signal; genuine faults retain stacks.

## VCA-021 — Current documentation certifications are not bound to the current artifact and gates

- Severity: **P2**
- Workstream: Cross-cutting
- Status: Documentation conflict
- Surface: task status index, client readiness, historical audit/task plans
- Authority: evidence/provenance rules
- Evidence: readiness cites 31 migrations versus 91 now; status index has duplicate contradictory Task 100 rows; DONE claims coexist with invalid current CI and untested current Docker/DB gates.
- Preconditions: Operator/reviewer uses documents as current certification.
- Reproduction/verification: E-DOC-01 comparison to current repo/build/CI.
- Observed: Historical proof is phrased as present readiness.
- Expected: certifications name commit, environment, date, evidence IDs, expiry/supersession and open limitations.
- Impact: deployment decisions can rely on stale truth and miss newly introduced gaps.
- Scope: platform, client, security and deployment claims.
- Suggested direction: create immutable certification records per artifact and mark living indexes as non-certifying summaries.
- Retest gate: every readiness claim links to a passing current gate for the exact artifact/profile.

