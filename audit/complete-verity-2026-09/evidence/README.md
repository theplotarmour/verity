# Evidence Notes

This directory intentionally contains no raw environment dump, connection string, credential, customer record, database dump, or authenticated browser state.

## Retained probes

- `check-db-catalog.mjs` — read-only PostgreSQL catalog/global-metadata probe. It prints role attributes, RLS/FORCE RLS/policy/grant summaries, SECURITY DEFINER metadata, schema privileges and the globally visible capability catalog. At this snapshot the catalog query returned no rows without tenant context, demonstrating fail-closed visibility rather than an empty product registry.
- `audit-vitest.config.ts` — audit-only Vitest runner with no database setup, used only for selected pure tests. It stubs the same `server-only` marker as the canonical config and excludes ignored worktrees/generated directories.

## Redacted command results

| Evidence ID | Exact high-level result |
|---|---|
| E-SNAP-01 | `main`; SHA `2a71102e3489231227613d1b5c1115f82c55fec3`; initial status contained only Task 107 prompt |
| E-DEP-01 | audit: 2 moderate, 0 high, 0 critical; working `npm ls` invalid because Next/eslint 16.2.10 installed versus 16.3.3 lock |
| E-DEP-02 | detached HEAD archive: `npm ci` exit 0; Next 16.3.3; clean lint exit 0 with 1 warning; clean build exit 0 |
| E-CI-01 | GitHub workflow run `34969894186`: invalid YAML duplicate keys at lines 52/53 |
| E-DB-01 | role `verity_app`, superuser false, bypass RLS false; 140 tables; 139 RLS + FORCE; 170 policies; 0 RLS table without policy |
| E-TEST-01 | 72 suites refused before tests because remote DB safety guard fired |
| E-TEST-02 | selected pure slice: 10 files, 118 tests, 117 pass, 1 fail |
| E-BUILD-01 | working build exit 0 on Next 16.2.10 after Prisma generation |
| E-BUILD-02 | detached clean build exit 0 on Next 16.3.3 |
| E-LINT-01 | workspace lint: 6 errors/4 warnings from ignored nested worktree/mockup plus app warning; clean archive: 0 errors/1 warning |
| E-RUN-01 | sign-in meaningful/no overlay/no browser errors; health/ready 200; metrics/scheduled 401; protected pages redirect/deny |

## Reproduction cautions

Do not run the normal suite against the current `.env`. Never set `VERITY_TEST_ALLOW_REMOTE_DATABASE=1` unless the URL has independently been proven disposable. Run destructive database, e2e, backup, restore and fault-injection tracks only in an isolated lab.

