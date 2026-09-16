# Task 108 Remediation Status

**Started:** 2026-09-16  
**Baseline:** `main@2a71102e3489231227613d1b5c1115f82c55fec3`  
**State:** implementation in progress; Phase 0/1 commits are pushed to
`origin/main` through `6534e2d`. No deployment or credential rotation performed.

## Phase status

| Phase | Status | Evidence |
|---|---|---|
| 0 — containment/baseline | Partial | Audit snapshot preserved; external deployment inventory unavailable |
| 1 — release/dependencies | Implemented and pushed | Clean install, exact versions, audit, validators, 73 pure tests, typecheck, lint, build, standalone smoke |
| 2 — security boundaries | Implemented in code | Web privilege removal, function ACL migration, uniform capability guards, 15-page inventory, and 91-test pure gate; live PostgreSQL/Compose proof pending |
| 3–7 | Pending | Dependency and architecture gates not yet satisfied |

## Finding status changed by this run

| Finding | Current remediation state | Remaining closure gate |
|---|---|---|
| VCA-001 | Implemented locally | Fresh required GitHub job on exact commit |
| VCA-002 | Implemented in Compose | Container environment inspection, migration-tools proof, credential rotation inventory |
| VCA-011 | Locally remediated | Signed/deployed artifact digest and container acceptance |
| VCA-013 | Locally closed | Included in fresh required CI job |
| VCA-014 | Locally closed | Included in exact release evidence |
| VCA-019 | Migration implemented | Apply to fresh/upgraded PostgreSQL and run principal/function matrix |
| VCA-006 | Execution planes guarded | Run full database state matrix on absent/active/suspended/dependency-inactive tenants |
| VCA-018 | Response/log leakage reduced | Profile-aware identity/storage/scheduler/restore checks remain |

## Local evidence summary

- `npm ls`: Next and eslint-config-next 16.3.3; Vitest and mocker 4.1.11.
- `npm audit --json`: zero vulnerabilities.
- `npm run validate:workflow`: valid YAML with unique mapping keys.
- `npm run validate:deployment-security`: all encoded invariants present.
- `npx prisma validate`: valid schema; two pre-existing SetNull warnings remain.
- `npm run test:pure`: 8 files, 91 tests passed after Phase 2 guard work.
- `npm run typecheck`: passed.
- `npm run lint`: passed with one pre-existing TanStack compiler warning.
- `npm run build`: passed on Next 16.3.3; route manifest generated; Edge crypto warning removed.
- Standalone `/api/health`: 200.
- Standalone `/api/ready` with unavailable DB: 503 as required.
- Hostile wildcard Supabase image URL: 400, not allowed.

## Environment blockers

The current host has neither Docker nor `psql`. No claim is made for Compose
startup, migration application, RLS/function ACL behavior, full database tests,
backup/restore, scheduler, or on-prem certification.

## Credential action required

During diagnosis of Prisma's import-time `.env` loading, an existing local
application database credential entered command output. Its value is not copied
into this repository or this evidence file. Treat that credential as exposed:
rotate/revoke it in the provider, update the local ignored environment file,
and record only the rotation date and affected environment in the Phase 0
closure record.
