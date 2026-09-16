# Authority and Claims Ledger

## Canonical requirements used

| Authority | Requirement applied | Current evidence | Assessment |
|---|---|---|---|
| Bible V1, lines 60–77 | Purpose-built capabilities must expose stable platform contracts; Industry Packs compose them. | Commands, queries, entity ownership and contributions exist; packs do not. | PARTIAL |
| Bible V1, lines 129–154 | New client systems should be composable quickly and marketing must not promise unsupported configuration. | Client capabilities are substantial, but configuration/pack/extension claims exceed runtime support. | FAIL for complete-platform claim |
| Bible V5, lines 8–20 | Tenant isolation is absolute and enforced at database level; tenant derives from session. | Live RLS/FORCE RLS and runtime-role proof pass. | PASS at database catalog layer |
| `verity-spec/01_platform/client-systems.md` | Client System = Core + Capabilities + Packs + Extensions. | Core/capabilities built; packs/extensions marked future and absent. | PARTIAL |
| `verity-spec/01_platform/packs.md` | Declarative pack manifest and activation. | No manifest schema, resolver, activation transaction, or pack tests. | FAIL |
| `verity-spec/01_platform/versioning.md` | Independent SemVer, tenant pins, upgrade authorization/scripts. | Version strings/pinnedVersion storage exist; upgrade runtime does not. | FAIL |
| `verity-spec/01_platform/configuration.md` | Hierarchical configuration plus operational templates. | ConfigParameter and custom fields exist; document/checklist template plane does not. | PARTIAL |
| `implementation/09-capabilities/implementation-contract.md` | 31 implementation points plus 8 reusable-capability proofs before “DONE”. | No capability has a current full contract dossier/performance proof. | FAIL for “complete” |
| `implementation/13-conformance/release-gates.md` | Green checks, no P0/P1, traceability, security and performance proof. | Current CI does not parse; full suite and Docker lab untested; P1s open. | FAIL |

## Current client-document truth

| Document/system | Document's own posture | Code-grounded status at snapshot |
|---|---|---|
| `plywood.md` | “PARTIALLY BUILT / ACTIVE CLIENT CAPABILITY” | Accurate at headline level. Trading/Plywood is the deepest operating slice, but logistics/LR/e-way/rental/deeper delivery remain targets and full current regression proof is unavailable. |
| `KentsRestaurant.md` | “BUILT BASELINE / DESIGN AUTHORITY” | Dine-in plus lean restaurant support capabilities are built, but scheduled SLA/notification transport and end-to-end on-prem execution are not proven. Treat as **built controlled baseline**, not complete production pack. |
| `clinic.md` | Design authority with decisions/gaps | No `src/server/capabilities/clinic` and no clinic route family exists. **PLANNED/TARGET**, not built. |
| `clients/colonel-kebabz/prd.md` | Product definition | Target PRD. The phase plan records lean V1 slices and explicit deferrals; not a complete delivered restaurant OS. |
| `clients/colonel-kebabz/phase-plan.md` | Draft with shipped lean phases | Useful implementation ledger, but explicitly leaves franchise, dashboards, consumption variance and other areas unbuilt. |
| PA OMS outreach authority | Authoritative role/operations design | Outreach has a broad capability and pages, but current database tests were not safely rerun and AI live use remains configuration/provider constrained. **BUILT NOT FULLY VERIFIED**. |

## Contradictions and stale claims

| Claim | Contradicting current evidence | Classification |
|---|---|---|
| `implementation/client-readiness.md` says platform/HQ and client foundation are ready and cites 31 migrations. | There are 91 migration directories, the current CI workflow is invalid, and current acceptance was not run. | DOCS CONTRADICTION / stale certification |
| `taskplans/00_STATUS_INDEX.md` lists the Next security task and many platform tasks as DONE and says old checks were clean. | The working install is Next 16.2.10, current CI does not parse, current config/import tests fail in safe slices, and Docker proof is unavailable. | Historical truth presented as current truth |
| The status index marks Task 100 decisions done, then separately lists Task 100 pending. | Same document contains mutually inconsistent rows. | DOCS CONTRADICTION |
| `.env.example` says `OPENAI_*` is unused. | `src/server/platform/config.ts:261-272` reads `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`. | DOCS CONTRADICTION |
| `.env.example` says `S3_*` variables were removed as unused. | Self-hosted storage reads `VERITY_S3_*`; the live `.env` exposes only legacy `S3_*` names, while deploy template uses the new names. | Operational drift |
| On-prem docs present OIDC as an auth provider. | Task 36 explicitly excludes the browser redirect/PKCE flow and no callback route or cookie-setting path exists. | Capability overstatement |
| Backup runbook says no automation script exists and specifies data-only migrate-first restore. | `deploy/scripts/backup.sh` and `restore.sh` exist and implement full dump/full restore semantics. | DOCS CONTRADICTION |

## Decision provenance

`verity-spec/17_decisions/unresolved.md` currently states that there are no unresolved decisions. That is accepted as the current decision register, superseding older audit memory. It does **not** convert future-marked specifications into implementation, nor does it waive the executable release gates.

