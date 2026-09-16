# 107 — Complete Verity security, modular-completion, and on-premises deployability audit prompt

**Status:** READY TO EXECUTE — audit brief only; no audit result is claimed here.

**Created:** 2026-09-16

**Scope:** a complete, evidence-led assessment of the current Verity repository and a
named running environment across three independent questions:

1. Is Verity secure enough for an enterprise deployment?
2. Is Verity actually complete as the module-driven platform described by its
   canonical product model?
3. Can Verity be installed, operated, upgraded, backed up, restored, and supported
   on customer-controlled infrastructure without an undeclared cloud dependency?

This file **is the audit prompt**. Give everything below the divider to a fresh audit
session started at the repository root, `D:\Code\verity`.

The audit is intentionally separated from remediation. The auditor may create and
update evidence under `audit/complete-verity-2026-09/`; it must not change application
code, dependencies, lockfiles, schema, migrations, deployment configuration, or
canonical product documentation.

---

# VERITY COMPLETE ENTERPRISE AUDIT

You are the independent lead auditor for Verity. Your job is to establish what is
demonstrably true about the present system, identify material gaps, and issue a
deployment verdict. You are not implementing fixes in this engagement.

Do not infer readiness from intent, file names, old task statuses, a clean Git tree,
passing typecheck, or a successful build. Treat prior reports as historical evidence
whose claims must be revalidated against the named snapshot.

The audit has three co-equal workstreams:

- **Security and data protection**
- **Modular-platform completeness**
- **On-premises/self-hosted deployability and operations**

A severe failure in any one workstream can determine the overall verdict.

## 1. Non-negotiable audit rules

1. **Assessment only.** Do not fix findings. Do not upgrade dependencies. Do not edit
   `src/`, `prisma/`, `deploy/`, Docker files, environment templates, tests, Bible,
   specification, implementation corpus, or client documents.
2. **Permitted writes are audit artifacts only.** Write exclusively beneath
   `audit/complete-verity-2026-09/`, except for transient test output already created by
   repository commands. Do not commit or push.
3. **Name the snapshot.** Record branch, full commit SHA, working-tree status, Node/npm
   versions, OS, database type/version, execution environment, and audit start/end
   timestamps. If the tree is dirty, inventory the changes and state whether each was
   included in the audited snapshot. Never discard or overwrite user changes.
4. **No secret disclosure.** You may inspect variable names, presence, origin, scope,
   and validation. Never print or copy `.env` values, tokens, passwords, connection
   strings, customer data, private keys, cookies, or authorization headers into the
   terminal transcript or reports. Redact evidence at capture time.
5. **Do not use privileged application credentials as runtime proof.** The application
   database connection must be checked as a non-superuser, `NOBYPASSRLS` runtime role.
   Migration/admin credentials must be assessed separately.
6. **Runtime claims require runtime evidence.** Source review can prove that a control
   is designed or wired; it cannot prove the deployed behavior. A behavioral PASS needs
   a test, request/response, browser observation, database assertion, log event, or
   deployment exercise against the named environment.
7. **Source claims require exact citations.** Cite repository-relative path and current
   one-based line number. Cite the governing Bible/spec/implementation requirement for
   every conformance finding.
8. **Documentation is not implementation.** Mark a feature as built only when code,
   wiring, persistence where required, and proportionate tests exist. A taskplan,
   registry entry, schema model, placeholder page, mock data, or uncalled helper alone
   is not completion.
9. **Tests are evidence, not absolution.** Record exactly what each test establishes and
   what it does not. Never translate “suite passed” into “secure” or “complete.”
10. **Do not run destructive, disruptive, exploit, load, failover, backup-restore, or
    data-mutating tests against production.** If only production is available, perform
    safe review, mark the executable gate UNTESTED, and specify the isolated staging or
    lab setup required. Obtain explicit authorization before any destructive test in
    any shared environment.
11. **Safe adversarial testing is local/staging only.** No credential stuffing,
    uncontrolled scanning, malware, third-party abuse, denial of service, or access to
    real cross-tenant data. Use synthetic tenants, synthetic files, bounded request
    rates, and reversible fixtures.
12. **Preserve fail-closed controls.** Do not weaken RLS, authorization, session
    validation, module guards, upload validation, audit append-only controls, or tests
    to make a check pass.
13. **Unknown is not green.** Use UNTESTED when proof is unavailable. Use NOT APPLICABLE
    only with an explicit reason and authority.
14. **Contradictions are findings.** When Bible, specification, implementation corpus,
    taskplans, client docs, source, tests, and runtime disagree, record the conflict and
    identify which authority governs. Do not silently choose the most convenient claim.
15. **Continue through all workstreams after a blocker.** A P0/P1 may determine the
    verdict, but it must not stop inventories and coverage accounting unless continued
    execution would be unsafe.

## 2. Authority and truth model

Audit against the repository's declared authority order:

1. `verity-bible/` — constitutional product authority
2. `verity-spec/` — mandatory platform and capability requirements
3. `implementation/` — implementation contracts and release/conformance gates
4. Approved ADRs and unresolved-decision register, interpreted within the hierarchy
5. Current code, schema, migrations, configuration, tests, and runtime behavior
6. Taskplans, historical audits, status indexes, client documents, and guides as
   claims/evidence, never as higher authority

Read at minimum before issuing findings:

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `verity-bible/README.md` and all six Bible volumes
- `verity-bible/_synthesis/verity-canonical-update.md`
- `verity-bible/_synthesis/conflict-register.md`
- `verity-bible/_synthesis/capability-coverage-matrix.md`
- `verity-spec/README.md` or the actual spec entry point
- `verity-spec/01_platform/`
- `verity-spec/17_decisions/unresolved.md`
- every approved ADR in `verity-spec/17_decisions/adr/`
- `implementation/README.md`
- `implementation/00-build-charter/`
- `implementation/03-platform-foundation/`
- `implementation/09-capabilities/implementation-contract.md`
- `implementation/11-platform-operations/`
- `implementation/12-testing/`
- `implementation/13-conformance/`
- `implementation/15-traceability/`
- `implementation/16-environment/env-contract.md`
- current client truth documents, including `plywood.md`, `KentsRestaurant.md`,
  `clinic.md`, `coaching.md`, and `salon.md`
- prior audit/deployment plans relevant to the present claim, including Tasks 24–47,
  67, 85, 101, 102, 104, and later plans that supersede them

Run an authority contradiction scan. In particular, do not treat an approved-sounding
walkthrough, a “complete” taskplan status, or a clean worktree as proof that unresolved
decisions and unimplemented requirements are closed.

## 3. Evidence model and status vocabulary

Every control, requirement, module, route, command, deployment gate, and finding must
carry one status:

| Status | Meaning |
|---|---|
| `PASS` | Current, direct, repeatable evidence satisfies the criterion completely. |
| `PARTIAL` | A material subset exists or passed, but one or more required parts are absent or unproved. |
| `FAIL` | Direct evidence contradicts the criterion or a required control is absent. |
| `UNTESTED` | The criterion may or may not work; it was not safely or practically exercised. |
| `NOT APPLICABLE` | The criterion genuinely does not apply, with a stated reason and authority. |
| `DOCS CONTRADICTION` | Authorities or claims conflict and no honest single status can be issued without resolution. |

For product/capability descriptions, also classify implementation state as exactly one
of:

- `BUILT AND VERIFIED`
- `BUILT, NOT VERIFIED`
- `PARTIAL`
- `PLACEHOLDER OR DEMO ONLY`
- `PLANNED ONLY`
- `TARGET / ASPIRATIONAL`
- `ABSENT`
- `BLOCKED BY DECISION`

Do not collapse these states into “supported.”

### Minimum proof bundle for a PASS

A PASS must contain:

- criterion ID and governing authority;
- inspected code/config/schema paths with line citations where relevant;
- executable evidence with command/test/request identifier;
- actual observed outcome and timestamp;
- environment and actor/tenant context;
- negative-path evidence where the criterion is a security or isolation boundary;
- limitations and residual risk.

If executable proof is not applicable, explain why and provide the strongest alternate
evidence. Otherwise the status is UNTESTED, not PASS.

## 4. Severity and attack-path requirements

Use these severities:

| Severity | Meaning |
|---|---|
| `P0 — Critical` | Active or readily exploitable cross-tenant exposure, authentication bypass, material financial corruption, unrecoverable data-loss path, secret compromise, or a blocker that makes deployment unsafe. |
| `P1 — High` | Serious security/control failure, privilege escalation, broad data exposure, unsafe deployment default, broken restore/upgrade, or foundational modularity failure with high operational impact. |
| `P2 — Medium` | Material but bounded weakness, incomplete defense-in-depth, incomplete module behavior, operational fragility, or misleading readiness claim. |
| `P3 — Low` | Limited-impact defect, hardening opportunity, localized inconsistency, or maintainability risk. |
| `P4 — Informational` | Observation, positive control, or future improvement without a present defect. |

Every P0/P1 finding must include an **attack/failure path**:

1. actor or failure source;
2. entry point;
3. trust boundary crossed;
4. missing or failed control;
5. preconditions;
6. affected tenant/data/service/module;
7. confidentiality, integrity, availability, regulatory, and business consequences;
8. detection likelihood and available logs;
9. bounded proof performed, or reason exploitation was not attempted;
10. containment and remediation direction, without implementing it.

Separate demonstrated impact from plausible maximum impact.

## 5. Required output set

Create this directory and maintain the files continuously:

```text
audit/complete-verity-2026-09/
  00-executive-verdict.md
  01-snapshot-and-method.md
  02-authority-and-claims-ledger.md
  03-security-audit.md
  04-module-catalog-matrix.md
  05-client-configuration-matrix.md
  06-client-data-and-isolation-matrix.md
  07-route-action-api-guard-inventory.md
  08-on-prem-deployability.md
  09-data-recovery-and-operations.md
  10-dependency-and-supply-chain.md
  11-test-and-runtime-evidence.md
  12-findings-ledger.md
  13-attempted-and-resisted.md
  14-untested-and-blocked.md
  15-remediation-roadmap.md
  evidence/
```

Do not place secrets, raw environment dumps, database dumps, authentication state, or
customer records in `evidence/`. Store concise redacted transcripts and checksums where
useful. If a tool produces unsafe raw output, summarize it instead of saving it.

### Finding format

Use one canonical entry per finding in `12-findings-ledger.md`:

```markdown
## VCA-NNN — <defect, not symptom>

- Severity: P0 | P1 | P2 | P3 | P4
- Workstream: Security | Modular completion | On-prem operations | Cross-cutting
- Status: Confirmed | Probable | Unverified risk | Documentation conflict
- Surface: <route/action/module/table/deployment component>
- Snapshot/environment: <commit and named environment>
- Authority: <Bible/spec/ADR/implementation citation>
- Evidence: <source citations plus runtime/test evidence IDs>
- Preconditions: <what must be true>
- Reproduction/verification:
  1. <safe, repeatable step>
- Observed: <exact result, redacted>
- Expected: <required result>
- Impact: <business and technical effect>
- Scope: <known affected and not-yet-proven affected areas>
- Attack/failure path: <mandatory for P0/P1>
- Detection and auditability: <would operators know?>
- Suggested direction: <bounded remediation; no patch>
- Retest gate: <specific proof needed to close>
```

Deduplicate symptoms that share one root cause, but list all affected surfaces.

## 6. Phase 0 — establish the audit snapshot and safety boundary

Before analysis:

1. Record `git status --short`, current branch, `git rev-parse HEAD`, remotes without
   credentials, and latest commit subject/date.
2. Inventory tracked/untracked modifications without opening secret files. State which
   are user changes and whether they affect scope.
3. Record OS, architecture, Node, npm, PostgreSQL client, Docker/Compose, and browser
   versions if installed.
4. Record the current versions resolved for Next.js, React, Prisma, auth, storage,
   telemetry, validation, and other security-sensitive packages from the lockfile.
5. Identify the available environments: local, isolated test, preview/staging,
   production, Docker host, and clean PostgreSQL instance. Never assume they exist.
6. Identify which commands may mutate the database. Inspect scripts before running
   them. `npm run build` and tests are not automatically read-only in this repository;
   verify their behavior and target first.
7. Define synthetic tenant A, tenant B, HQ/operator, tenant owner, manager, narrow
   worker/counter role, disabled/roleless membership, and unauthenticated actor needed
   for isolation and authorization evidence.
8. State which test classes are authorized and safe in the named environment. Put all
   others in `14-untested-and-blocked.md` with exact prerequisites.

## 7. Phase 1 — build exhaustive inventories before scoring

Use `rg --files` and focused searches. Exclude `.next`, `node_modules`,
`graphify-out`, `dist`, `build`, test output, and generated artifacts from broad source
inventories.

### 7.1 Runtime surface inventory

Enumerate from current code, not from old route lists:

- every App Router page, route group, layout, error/not-found/loading boundary;
- every HTTP route and method;
- every Server Action and exported mutation/query entry point;
- every scheduled/cron entry point;
- every upload/download/presign path;
- every agent/AI tool or chat action;
- every webhook/integration callback;
- every health, readiness, metrics, debug, and administrative endpoint;
- every redirect/rewrite/proxy matcher and public-path exception;
- every script capable of migration, bootstrap, seed, backup, restore, or privilege
  assignment.

For each surface record authentication, tenant derivation, permission check, row scope,
field redaction, module guard, validation, rate/size limit, transaction boundary, audit
event, sensitive input/output, and tests.

### 7.2 Persistence and trust-boundary inventory

Enumerate:

- every Prisma model and migration-created object not visible in Prisma;
- tenant key and organization key for each table;
- RLS enabled/forced/policy state;
- foreign keys that could cross tenants;
- append-only/immutable tables and database enforcement;
- database functions, triggers, extensions, grants, owners, and default privileges;
- object storage providers, buckets, key namespace rules, and lifecycle states;
- auth providers and identity/session stores;
- external APIs, telemetry, email, AI providers, fonts/assets, CDNs, package registries,
  and any runtime egress;
- secrets and configuration sources by variable name only;
- browser/server/container/database/operator-machine trust boundaries.

### 7.3 Module and capability inventory

Derive a complete list from registries, contributions, schemas, routes, permissions,
commands, queries, navigation, tests, and client docs. Do not use a single registry as
the sole truth.

For every module/capability capture:

- canonical key, name, type, owner, and boundary: Core Platform / Reusable Module /
  Client Pack / Client Extension / Legacy or Technical Debt;
- declared and actual dependencies;
- definition/registry implementation;
- tenant activation/entitlement state;
- version and upgrade/migration model;
- configuration schema and UI;
- owned entities/tables and data-retention behavior;
- permissions and all three authorization layers;
- page/action/write guards;
- navigation and dashboard contributions;
- commands, queries, workflows, events, jobs, notifications, evidence, audit, reports,
  import/export, offline behavior, and observability;
- empty, loading, error, degraded, disabled, expired, dependency-missing, and
  unauthorized states;
- unit, contract, integration, browser, tenancy, and acceptance evidence;
- client(s) currently depending on it;
- implementation status from the vocabulary in section 3.

## 8. Workstream A — complete security audit

Assess design, implementation, configuration, database enforcement, runtime behavior,
and deployment defaults. Do not limit the audit to HTTP routes; Server Actions and
server-side query/command runtimes are part of the attack surface.

### A1. Threat model and security architecture

- Identify protected assets: tenant business data, financial/tax records, identity,
  role grants, audit history, files/evidence, credentials, configuration, AI context,
  backups, signing/encryption keys, and deployment control plane.
- Identify actors: anonymous user, authenticated user, low-privilege member, tenant
  owner, HQ/operator, support operator, database runtime, database admin, deployment
  operator, malicious tenant, compromised browser, compromised integration, and supply
  chain attacker.
- Map trust boundaries and top abuse cases.
- Check whether controls are centralized or inconsistently reimplemented.
- Verify fail-closed behavior for missing/malformed security configuration.

### A2. Authentication and sessions

- Provider abstraction versus hard dependency; Supabase and OIDC paths actually wired.
- Sign-in, callback, logout, refresh, revocation, expiry, malformed/forged token, deleted
  user, archived identity, membership removal, tenant switch, and concurrent sessions.
- Cookie flags: Secure, HttpOnly, SameSite, path/domain, lifetime, rotation, signing key
  strength, production enforcement, and behavior behind TLS-terminating reverse proxy.
- Open redirects, callback validation, session fixation, stale claims, identity-to-party
  linkage, account enumeration, password/reset behavior where owned by Verity.
- Bootstrap/operator assignment path and separation from normal runtime authority.

### A3. Tenant isolation and PostgreSQL RLS

- Runtime role must be `NOSUPERUSER NOBYPASSRLS`; application startup/readiness must
  refuse unsafe roles.
- For every tenant-bearing table: `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL
  SECURITY`, correct policies for reads/writes, no permissive policy gaps, and coverage
  for child organizations.
- Tenant context must derive from verified session/membership, never request payload,
  route parameter, hidden field, or client-selected organization alone.
- Verify transaction-local tenant context, connection-pool compatibility, reset after
  errors, background-job scope, migration/admin path separation, raw SQL safety, and
  transaction budgets.
- Check cross-tenant foreign keys, globally shared definition tables, composite keys,
  unique constraints, search/report queries, counts/aggregates, audit/history, files,
  caches, exports, agent grounding, and error-message side channels.
- Execute safe two-tenant positive and negative tests using synthetic data. Test wrong
  tenant IDs, stale membership, disabled tenant, child/root organization, and concurrent
  sessions. Do not use real customer records.

### A4. Authorization and module enforcement

- Verify the three layers independently: verb/entity permission, row scope, and field
  redaction.
- Verify route/page guards, Server Action guards, write guards, query filters, direct URL
  access, and forged client input.
- Navigation hiding is not authorization. Disabled or expired modules must be
  unreachable and immutable through direct routes/actions while retained data follows
  the declared policy.
- Check HQ/operator boundary, impersonation/support access if any, platform-global
  permission semantics, default roles, role editing, grant escalation, self-grant,
  mass assignment, and roleless memberships.
- Verify every registered action/query permission is declared, assignable only where
  intended, and actually enforced.

### A5. Request, action, and API security

- Proxy/middleware matchers, public route allowlist, auth callbacks, health/readiness,
  metrics, scheduled endpoints, agent endpoints, and static assets.
- Server Action authentication, authorization, tenant scope, module guard, Zod/schema
  validation, CSRF/origin protection, replay/idempotency, body size, serialization, safe
  errors, and audit behavior.
- HTTP method handling, content types, CORS, host/origin validation, caching of private
  responses, response headers, redirect safety, parameter pollution, and pagination
  bounds.
- Injection review: Prisma/raw SQL, shell/process invocation, template injection,
  spreadsheet formula injection, path traversal, SSRF, URL fetches, header injection,
  log injection, and prompt/tool injection.
- Browser security: XSS sinks, HTML sanitization, CSP, clickjacking, MIME sniffing,
  referrer policy, permissions policy, source maps, and sensitive hydration payloads.
- Abuse controls: rate limiting, brute-force protection, costly search/report/AI calls,
  upload limits, batch limits, concurrency limits, and multi-instance behavior.

### A6. Files, evidence, import, and export

- Tenant-namespaced object keys; no user-controlled bucket/key escape.
- Presign authorization and expiry; upload confirmation; checksum, declared/actual size,
  MIME/type validation; Pending/Stored/Quarantined lifecycle; download authorization.
- Filename/path safety, malware policy, image/document processing, decompression/archive
  bombs, orphan cleanup, deletion/retention, object-store encryption, and audit trail.
- CSV/import preview-validation-commit behavior, formula injection on export, partial
  failure, idempotency, and reconciliation.
- Behavior when storage is unavailable or credentials are missing.

### A7. Secrets, configuration, logging, and privacy

- Search tracked history and current tracked files for secret patterns without printing
  values. Check `.gitignore`, Docker build context, image layers, CI, Vercel config,
  example env files, logs, browser bundles, test fixtures, screenshots, and reports.
- Validate required/optional configuration, production-only constraints, key rotation,
  credential encryption, cron secrets, OIDC secrets, storage keys, telemetry DSNs, AI
  keys, and no insecure defaults.
- Verify logs, Sentry/telemetry, audit payloads, AI prompts, errors, metrics, and health
  responses exclude credentials and unnecessary personal/tenant data.
- Inventory personal data, purpose, access, export, retention, deletion/anonymization,
  backup persistence, support access, and DPDP tensions. Record legal/compliance gaps as
  control gaps, not as legal certification.

### A8. Data integrity, audit, and business controls

- Transactionality for multi-row business operations; idempotency and duplicate submit;
  concurrency on numbering, reservation, approval, close, payment, stock, and posting.
- Append-only/immutable controls for audit events, domain events, stock ledger, issued
  documents, and closed periods at the database level where required.
- Audit actor, tenant, action/command key, before/after diff, success/failure, timestamp,
  correlation ID, and tamper resistance.
- Financial and tax correctness boundaries, series uniqueness, corrections by note,
  period locking, GST applicability, CGST/SGST versus IGST, ITC, reconciliation, and no
  facility for concealing taxable transactions.
- Backup confidentiality/integrity and restore of security controls, roles, grants,
  triggers, extensions, and RLS—not merely rows.

### A9. AI/agent and integration security

- Grounding is tenant-scoped and permission-filtered before model access.
- Tool/command allowlist, confirmation classes, write authorization, idempotency,
  hallucination resistance, exact entity resolution, prompt injection from tenant data,
  cross-tenant context, sensitive-output redaction, conversation retention, and audit.
- Provider key handling, data residency/egress disclosure, timeouts, cost/rate controls,
  provider failure, and a configuration that disables external AI cleanly.
- Webhook signing, replay protection, outbound allowlists, retry/idempotency, secret
  rotation, and integration-specific least privilege.

### A10. Dependency and supply-chain security

- Run a non-mutating dependency audit appropriate to the lockfile; save redacted output.
- Record installed versions, direct versus transitive path, severity, exploitability in
  Verity's runtime, fixed versions, and compensating controls. Do not auto-fix.
- Review install/build scripts, package lifecycle hooks, lockfile integrity, pinned base
  images, image digests, OS packages, provenance/SBOM availability, CI permissions,
  artifact signing, and source-map exposure.
- Check current Next.js security status for the installed exact version using official
  advisories if internet access is authorized. Do not rely on the historical 16.2.10
  finding; the current tree must be assessed independently.
- A clean `npm audit` does not close framework configuration, application security, or
  container/OS risk.

## 9. Workstream B — modular-platform completion audit

The controlling vision is not “many pages exist.” It is a strict separation of:

1. **Module Catalog** — Verity-owned definitions of reusable capabilities/modules,
   dependencies, permissions, contributions, versions, migrations, and lifecycle.
2. **Client Configuration** — tenant-specific activation, entitlements, parameters,
   roles/grants, navigation/dashboard composition, workflows, custom fields/templates,
   organization shape, and version pin/upgrade state.
3. **Client Data** — tenant-owned operational records, files, history, audit, and
   transactions that remain isolated and governed independent of configuration state.

Assess each plane separately and then verify their interaction.

### B1. Module Catalog completeness

- One canonical registry or explicit composition model; no competing legacy registry
  silently governs routes or permissions.
- Stable keys, human labels, ownership, lifecycle/status, semantic version, dependency
  constraints, compatibility, install/activate/disable/upgrade semantics, and
  migration/rollback policy.
- Modules declare their entities, permissions, commands, queries, navigation,
  dashboards/widgets, workflows, jobs, events, reports, settings, and acceptance tests.
- A real module boundary/SDK or another enforceable boundary prevents platform core from
  importing client/vertical internals.
- Adding a reusable module should not require tenant-specific conditionals, shell edits,
  hard-coded route maps, central permission edits unrelated to registration, or unsafe
  schema coupling. Prove the actual edit surface from recent modules.
- Classify every module as platform, reusable, pack, extension, or legacy debt. Flag
  manufacturing/plywood/restaurant assumptions in core.
- Check dependency cycles, missing dependencies, deactivation dependants, key changes,
  backwards compatibility, and module-owned test coverage.

### B2. Client Configuration completeness

- Tenant activation/entitlement source of truth and fail-closed status handling.
- Enable, disable, expiry, dependency resolution, pinned version, upgrade eligibility,
  and audit history.
- Role/permission templates plus tenant customization without cross-tenant or global
  leakage.
- Module-owned navigation contributions, role filtering, direct-route guards, and no
  `industry`/pack resolver used as authorization.
- Dashboard/widget composition from active modules and actor permissions. A hard-coded
  industry dashboard is not a modular dashboard.
- Structured configuration parameters with schema validation, defaults, versioning,
  provenance, safe rollback, and no unbounded JSON “escape hatch” standing in for a
  design.
- Custom fields, forms, tables, workflows, approvals, notification/document templates,
  locations/organizations, and readiness/setup state: distinguish complete generic
  platform behavior from one client-specific implementation.
- Config changes must be tenant-scoped, authorized, audited, testable, and incapable of
  corrupting existing client data.

### B3. Client Data completeness and isolation

- Every operational record has an unambiguous tenant owner; organization/factory/site
  scope does not replace tenant scope.
- No cross-tenant foreign keys, joins, aggregates, cache entries, file keys, search
  results, reports, AI context, audit entries, or exports.
- Data survives module disablement according to policy and cannot be accessed or mutated
  through the disabled module.
- Reactivation and module upgrades preserve compatible data and surface migration
  failures safely.
- Deletion, archival, retention, backup, restore, export, and tenant offboarding are
  defined and operationally executable.
- Client-specific extensions cannot alter another tenant's schema or behavior.

### B4. Cross-plane acceptance scenarios

Execute in an isolated environment where possible:

1. Create/configure tenant A with one business shape and tenant B with a materially
   different shape (for example plywood/trading and restaurant/dine-in).
2. Give them different active modules, versions/settings, roles, navigation, and data.
3. Verify each actor sees only entitled navigation, pages, commands, fields, widgets,
   queues, reports, and data.
4. Call hidden surfaces directly and submit forged actions; verify server-side refusal.
5. Disable a module with existing data; verify navigation removal, access/write denial,
   retained data, audit record, and safe reactivation.
6. Attempt to disable a dependency with an active dependant; verify deterministic,
   explained refusal or governed cascade.
7. Expire/suspend an entitlement; verify the same fail-closed behavior across page,
   action, job, API, report, file, and AI paths.
8. Change tenant configuration; verify no code deployment or cross-tenant behavior
   change is required.
9. Exercise dashboard composition. Confirm widgets originate from active module
   contributions rather than industry/pack hard-coding.
10. Trace at least one complete workflow per built module from UI to action, transaction,
    event/audit, query/read model, and report.

### B5. Capability completion scoring

For every capability, score these 20 dimensions 0–2:

1. authority/specification;
2. registry/metadata;
3. dependencies;
4. schema/migrations;
5. commands/write path;
6. queries/read path;
7. permissions;
8. row/field scope;
9. route/action/module guards;
10. lifecycle/workflow;
11. events/audit;
12. navigation;
13. UI/UX states;
14. tenant configuration;
15. reporting/export;
16. jobs/integrations;
17. offline/failure behavior;
18. observability/support;
19. automated tests;
20. end-to-end acceptance.

Scoring: `0 = absent/planned`, `1 = partial or unverified`, `2 = built and verified`.
Report raw scores and evidence. Do not use the aggregate to hide a zero in security,
tenant isolation, data integrity, or deployment-critical dimensions; those are hard
gates.

## 10. Workstream C — on-premises and customer-controlled deployability

“On-premises deployable” means more than “Next.js starts outside Vercel.” Assess at
least these profiles separately:

- **Profile P1: connected single-node** — one customer-controlled Linux host, outbound
  internet permitted, Docker Compose acceptable.
- **Profile P2: connected production** — reverse proxy/TLS, external managed or
  customer-managed PostgreSQL/object storage/identity, multiple application instances.
- **Profile P3: restricted-egress** — explicit outbound allowlist; no silent CDN/font,
  telemetry, auth, storage, AI, or package-registry dependency at runtime.
- **Profile P4: air-gapped/offline site** — no internet at runtime and potentially no
  internet during install/upgrade. Score only if the product claims this profile;
  otherwise state NOT SUPPORTED and enumerate what prevents it.

Do not conflate on-prem server deployment with offline browser/workstation sync. Audit
those as separate capabilities.

### C1. Build and artifact portability

- Reproducible clean build from lockfile; framework-local docs followed for the installed
  Next.js version.
- Build-time versus runtime configuration; no production secrets baked into client
  bundles, image layers, or `.next` artifacts.
- Linux/amd64 and required arm64 support, Prisma engine compatibility, non-root runtime,
  read-only filesystem compatibility, temporary directory needs, signal handling, and
  graceful shutdown.
- Standalone artifact completeness, static/public assets, fonts, native binaries,
  licenses/notices, image size, SBOM, vulnerability scan, version/build identity, and
  provenance.
- Pinned base image policy and rebuild/patch process.

### C2. Installation and bootstrap

- Operator-facing prerequisites, sizing, DNS, TLS/reverse proxy, ports/firewall, storage,
  database, identity, time synchronization, email, and secrets.
- Fresh PostgreSQL cluster proof—not only a fresh database on an already-prepared
  cluster—including extensions, runtime role creation, grants, migrations, seeds only
  where appropriate, and first operator bootstrap.
- Idempotent, rerunnable scripts with safe failure and no hidden developer account.
- Separation of migration/admin role from application runtime role.
- Health/readiness behavior during bootstrap and partial failure.
- Default credentials and development fallbacks must be rejected for production.

### C3. External-dependency freedom and provider substitution

For each runtime dependency answer: required, optional, replaceable, self-hostable,
disableable, and behavior when absent.

- PostgreSQL and extensions
- Auth/identity: Supabase, OIDC, local/self-hosted provider path
- Object storage: Supabase Storage, S3/MinIO or other compatible implementation
- Email/notifications
- Scheduled work and queue/worker requirements
- Telemetry/Sentry/OpenTelemetry
- AI provider/Groq and any remote inference
- Fonts, images, maps, analytics, CDNs, update checks, license calls, and browser egress

Prove restricted-egress behavior with network observation or a deny-by-default lab where
available. Source-only claims are PARTIAL.

### C4. Runtime topology, resilience, and scale

- Single instance and multi-instance correctness; statelessness; shared rate limits,
  caches, sessions, storage, job locks, scheduled work, and idempotency.
- Reverse proxy headers, client IP trust, HTTPS detection, secure cookies, request/body
  limits, timeouts, websocket/streaming needs, and rolling restart behavior.
- Database pool mode and capacity, transaction pinning, statement/transaction timeouts,
  connection leak behavior, and maintenance connections.
- Storage/database/auth unavailable behavior; readiness removes unhealthy instances
  without presenting a healthy-but-broken application.
- Clock/timezone/NTP assumptions and disk-full/read-only/low-memory behavior where safe.
- Document tested capacity only; otherwise report capacity as unknown.

### C5. Upgrade, rollback, and compatibility

- Versioned release artifact and compatibility matrix.
- Preflight, backup, maintenance window, migration, application rollout, health check,
  post-deploy validation, and rollback/roll-forward instructions.
- Expand/contract or other safe migration strategy for rolling/multi-instance upgrades.
- Behavior when migration succeeds but app rollout fails, or app version is older/newer
  than schema/module data.
- Module/tenant pinned versions and data migration—not merely application version.
- Upgrade rehearsal from the oldest supported version using a representative restored
  dataset. If not executed, mark UNTESTED.

### C6. Backup, restore, disaster recovery, and offboarding

- Back up database, storage objects, configuration, encryption/signing dependencies,
  roles/grants, and operator documentation as one recoverable system.
- Encryption at rest/in transit, backup access, retention, rotation, off-site copy,
  tamper protection, and restore authorization.
- Full restore to a fresh environment; verify login, tenant isolation, RLS, module
  configuration, files, audit history, jobs, and core transactions afterward.
- Measure RPO and RTO; do not quote targets that were not demonstrated.
- Point-in-time recovery requirements, corrupted backup detection, restore drills,
  tenant export/offboarding, and secure disposal.

### C7. Operations, observability, and supportability

- Structured logs, request/correlation IDs, audit versus operational logs, metrics,
  traces, dashboards, alerts, disk/database/storage/certificate/backup monitoring, and
  redaction.
- Public versus authenticated health/ready/metrics contracts and absence of sensitive
  detail.
- Log rotation, retention, time synchronization, support bundle generation, and a
  documented diagnostic path that does not require cloud-console access.
- Start/stop/status/log/health/backup/restore/upgrade/rollback/secret rotation/certificate
  rotation/operator change/incident response runbooks.
- Ownership, escalation, maintenance windows, security-patch SLA, dependency update
  process, and customer handoff.

### C8. Deployment security hardening

- Non-root container, minimal runtime, dropped capabilities, no Docker socket, no
  privileged mode, read-only mounts where possible, resource limits, restart policy,
  secret mounts/injection, network segmentation, database not publicly exposed, and
  least-privilege file permissions.
- TLS 1.2+ termination, HSTS, certificate management, firewall guidance, admin surface
  exposure, bastion/VPN assumptions, outbound allowlist, image scanning/signing, host
  patching, and secure defaults.
- `deploy/security/preflight.sh` and hardening documentation must be executed/reviewed,
  not merely cited.

## 11. Independent executable verification tracks

Run only after confirming targets and mutation behavior.

### Track T1 — static repository gates

- `npm ci` only if it will not disturb the user workspace; otherwise verify lockfile
  consistency in an isolated copy or explain why not.
- `npm audit --json` without `--fix`.
- `npm run typecheck`.
- `npm run lint`.
- focused security/conformance test inventory, then `npm run test` against an explicitly
  named safe database if the suite touches data.
- `npm run build` only after checking whether build-time imports or scripts mutate data.
- secret scan, dependency/license inventory, Dockerfile/Compose lint or equivalent,
  container image scan if tools are available.

Record exit code, duration, important warnings, environment, and evidence ID. Do not
truncate away the first relevant failure.

### Track T2 — database enforcement

Against an isolated database:

- migration status and clean migration from a fresh PostgreSQL cluster;
- runtime/admin role attribute checks;
- table-by-table RLS enabled/forced/policy/grant matrix;
- cross-tenant FK and uniqueness review;
- tenant A/B positive and negative queries through application runtime paths;
- append-only/closed-state enforcement;
- migration idempotency and failure behavior;
- connection-pool/transaction-local tenant-context checks.

### Track T3 — browser and API behavior

Use separate browser contexts for unauthenticated, HQ, tenant A owner, tenant A narrow
user, and tenant B user. Exercise:

- public/protected routing and return URLs;
- every inventory surface proportionate to its declared status;
- direct URL and forged action attempts for unauthorized/disabled modules;
- tenant switching and stale/malformed sessions;
- one end-to-end workflow per built module;
- keyboard/accessibility, light/dark mode, responsive sizes, empty/loading/error states;
- private response caching, headers, console errors, hydration failures;
- bounded duplicate submits and concurrency cases.

Record successful resistance in `13-attempted-and-resisted.md`, not only failures.

### Track T4 — clean on-prem deployment lab

Where Docker is available, use a clean isolated project name, unused ports, synthetic
secrets, and a new volume. Do not delete or reuse an existing volume.

Exercise the actual documented sequence:

1. build the production runtime and operator-tools artifacts;
2. start a fresh PostgreSQL cluster;
3. create the non-bypass runtime role through the real init path;
4. run migrations through the supported operator path;
5. bootstrap the first operator through the supported path;
6. start the application as non-root;
7. verify health, readiness, sign-in, tenant provisioning, and a core transaction;
8. restart every component and verify persistence/idempotency;
9. perform backup and restore into a second clean environment;
10. perform an upgrade/rollback rehearsal if a supported prior artifact exists;
11. repeat with optional cloud/telemetry/AI services disabled;
12. capture runtime egress for restricted-egress scoring.

If Docker is unavailable, do not call host execution of `server.js` a Compose PASS.
Mark container gates UNTESTED and distinguish which downstream artifact/runtime checks
were completed outside Docker.

### Track T5 — controlled failure and recovery

In an isolated lab only, test bounded cases:

- database unavailable before boot and mid-request;
- storage/auth/AI/telemetry unavailable;
- duplicate scheduled invocation;
- application termination during a multi-row operation;
- migration failure or incompatible schema version;
- expired secret/certificate where simulatable;
- full restore and post-restore verification.

Do not perform uncontrolled load or resource exhaustion. Define a separate authorized
performance test if capacity evidence is required.

## 12. Mandatory contradiction and contamination scans

Before verdicts, explicitly search for:

- `factoryId` or factory/industry assumptions in platform/core paths;
- role-named legacy routes or authorization paths;
- `resolvePackKey`, industry-to-dashboard logic, and tenant/client-name conditionals;
- legacy permission systems competing with registry permissions;
- pages hidden from navigation but missing page/action/write guards;
- route/action/module entries without tests or unreachable registry declarations;
- schema models with no tenant ownership or no RLS policy;
- configuration/helper code that is never called;
- mock/sample/hard-coded data presented as live functionality;
- `TODO`, `FIXME`, placeholder, pending, unimplemented, throw-not-supported, and silent
  fallback patterns in shipping paths;
- swallowed exceptions and success responses after failed mutations;
- aspirational docs stated in present tense;
- client docs that overstate or understate what the current code proves;
- unresolved ADRs/decisions cited as settled;
- cloud-provider assumptions in the nominally portable runtime;
- secrets/default passwords/placeholders accepted in production;
- outdated route, command, query, model, migration, test-count, and vulnerability claims.

Every match must be classified; do not report raw grep output as a finding.

## 13. Verdict gates

Issue independent verdicts first, then the overall verdict.

### 13.1 Security verdict

- `SECURITY READY`
- `SECURITY READY WITH CONTROLLED CONDITIONS`
- `SECURITY NOT READY`

Security cannot be READY with any open P0/P1, unverified tenant isolation, unsafe
runtime DB role, auth bypass, unprotected privileged write path, known exploitable
runtime dependency, unprotected secret, unverified backup confidentiality, or material
financial-integrity failure.

### 13.2 Modular-completion verdict

- `MODULAR PLATFORM COMPLETE FOR DECLARED SCOPE`
- `MODULAR PLATFORM PARTIAL — CONTROLLED CLIENT DELIVERY ONLY`
- `NOT A COMPLETE MODULAR PLATFORM`

Completion requires the three planes—Module Catalog, Client Configuration, Client
Data—to be implemented and independently verified for the declared scope. Many working
vertical pages do not compensate for missing server-side module guards, dashboard
composition, version/upgrade lifecycle, tenant configuration, data ownership, or module
boundaries.

### 13.3 On-premises verdict per deployment profile

- `ON-PREM DEPLOYABLE NOW`
- `ON-PREM DEPLOYABLE WITH CONTROLLED CONDITIONS`
- `ON-PREM NOT READY`
- `PROFILE NOT SUPPORTED` (only for a profile the product does not claim)

No profile is DEPLOYABLE NOW without an executed clean install, non-bypass runtime role,
fresh-cluster migration, production artifact start, health/readiness, first-operator
bootstrap, core transaction, restart persistence, backup/restore, documented operations,
and security preflight for that profile.

### 13.4 Overall enterprise deployment verdict

Use exactly one:

- `CAN DEPLOY TOMORROW`
- `CAN DEPLOY WITH CONTROLLED CONDITIONS`
- `NOT READY FOR ENTERPRISE DEPLOYMENT`

The overall verdict equals the weakest deployment-critical workstream, not an average.

For `CAN DEPLOY WITH CONTROLLED CONDITIONS`, list every condition as:

- owner;
- action;
- environment/client constraint;
- deadline or deployment gate;
- evidence required to remove the condition;
- consequence if unmet.

Do not use “controlled conditions” to hide an open P0/P1, unknown tenant isolation,
untested restore, or unexecuted installation path.

## 14. Remediation roadmap rules

The audit does not remediate, but `15-remediation-roadmap.md` must sequence findings:

- immediate containment;
- P0/P1 release blockers;
- security hardening;
- modular-foundation completion;
- on-prem install/operations closure;
- client/capability completion;
- long-term improvements.

Each remediation item must reference finding IDs, affected files/surfaces, required
decision/ADR if any, prerequisites, validation commands, negative security tests,
rollback considerations, and definition of done. Keep dependency upgrades narrow and
separate from unrelated cleanup. Never declare a finding closed in the roadmap.

## 15. Final review and delivery

Before finishing:

1. Reconcile every discovered route/action/API/model/module/deployment component against
   the inventories.
2. Ensure every PASS has current evidence and every missing proof is UNTESTED.
3. Ensure every P0/P1 contains the required attack/failure path.
4. Ensure positive security controls are recorded in `13-attempted-and-resisted.md`.
5. Cross-check findings against prior audits; label fixed, regressed, still open,
   superseded, or not re-tested without copying old verdicts.
6. Run a contradiction scan across all generated audit files.
7. Confirm `git diff` contains audit artifacts only and no secret-bearing evidence.
8. Put the concise decision first in `00-executive-verdict.md`, followed by:
   - the four verdicts;
   - P0/P1 findings;
   - highest-risk unknowns;
   - module completion summary;
   - per-profile on-prem summary;
   - deployment conditions/blockers;
   - exact evidence executed and not executed;
   - recommended next taskplans.

End with this declaration, completed truthfully:

> This report assesses repository commit `<full SHA>` plus the explicitly listed working
> tree changes and named environments. It distinguishes reviewed design, tested
> behavior, and untested claims. No production-code remediation was performed as part
> of the audit.

