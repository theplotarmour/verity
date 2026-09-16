# Snapshot, Scope, and Method

## Audited snapshot

| Field | Value |
|---|---|
| Repository | `theplotarmour/verity` |
| Branch | `main` |
| Commit | `2a71102e3489231227613d1b5c1115f82c55fec3` |
| Commit date | `2026-09-15T13:36:54+01:00` |
| Commit subject | `fix(trading): sales form quotes the default GST rate for boards with no HSN` |
| Host | Windows NT `10.0.26200.0`, x64 |
| Node/npm | Node `v24.16.0`; npm `11.13.0` |
| Prisma | CLI/client `6.19.3` |
| Docker / psql | Not installed on the audit host |

At audit start, `git status --short` contained only the user-requested untracked prompt:

```text
?? taskplans/107_complete_verity_security_modularity_on_prem_audit_prompt.md
```

The audit added only `audit/complete-verity-2026-09/`. The build regenerated ignored Prisma/Next artifacts but produced no tracked application diff. No commit or push was made.

## Safety boundary

- `.env` and `pacreds.txt` are local, ignored, and non-empty; their values were never printed or copied into the audit.
- Environment review recorded names and endpoint classifications only.
- The configured `DATABASE_URL` and `DIRECT_URL` both point to remote shared infrastructure. The normal test suite correctly refused to run without the explicit remote-mutation override. That override was not set.
- Database work was limited to PostgreSQL catalog/global-metadata reads. No tenant/customer rows were selected and no database writes were issued.
- Browser verification was unauthenticated and localhost-only. No account credentials were entered.
- Docker, migration, bootstrap, backup, restore, fault injection, and e2e mutation tracks were not attempted because an isolated lab was unavailable.

## Authority order

The audit applied the repository's declared order:

1. `verity-bible/`
2. `verity-spec/`
3. `implementation/`
4. application, schema, migrations, tests, and deployment assets as implementation evidence
5. task plans and client documents as claims requiring independent verification

The six Bible volumes, platform specifications, implementation contracts/release gates, current client documents, application surface, schema/migrations, deployment package, and test/CI configuration were searched and sampled at their normative sections. Generated trees (`.next`, `node_modules`, `graphify-out`) were excluded from source conclusions. The ignored `.claude/worktrees/completion-gap` tree was treated as contamination when lint discovered it, never as the audited implementation.

## Evidence IDs

| ID | Evidence |
|---|---|
| E-SNAP-01 | Git branch/SHA/status/host/tool snapshot |
| E-DEP-01 | `npm audit --json` and exact manifest/lock/installed version comparison |
| E-DEP-02 | Detached `git archive` + `npm ci` + version tree + clean production build |
| E-CI-01 | GitHub Actions public run for commit `2a71102`, rejected as invalid workflow |
| E-DB-01 | Read-only catalog probe in `evidence/check-db-catalog.mjs` |
| E-TEST-01 | Normal `npm test` refusal on remote database safety guard |
| E-TEST-02 | Audit-only pure test slice: 117 pass, 1 fail |
| E-BUILD-01 | Workspace build: success after Prisma generation, using installed Next 16.2.10 |
| E-BUILD-02 | Detached clean build: success using Next 16.3.3 |
| E-LINT-01 | Workspace lint: 6 errors caused by ignored worktree/mockup contamination; clean archive lint: exit 0 with one React Compiler warning |
| E-RUN-01 | Local production sign-in render, protected-route/API probes, response headers, and server logs |
| E-STATIC-01 | Route, action, API, capability, schema, migration, test, and deployment inventory |
| E-DOC-01 | Authority/client/task-plan contradiction scan |

## Status language

- `PASS`: source plus executable proof at this snapshot.
- `PARTIAL`: meaningful implementation exists but at least one required boundary or proof is missing.
- `FAIL`: observed behavior violates the stated requirement or release gate.
- `UNTESTED`: no safe/current executable proof was available.
- `DOCS CONTRADICTION`: two current-looking claims cannot both be true.
- `BUILT`, `BUILT NOT VERIFIED`, `PLANNED`, `DEMONSTRATED`, and `TARGET` describe implementation state, not aspiration.

## Limits of the conclusion

The report is deliberately harsher than a code-reading review. A clean build is not tenant isolation proof; catalog RLS proof is not user-flow proof; a historical task-plan “DONE” is not a current release gate; and a Compose file is not a demonstrated on-prem installation. Anything requiring destructive or tenant-data-bearing execution remains `UNTESTED`, never silently promoted to pass.

