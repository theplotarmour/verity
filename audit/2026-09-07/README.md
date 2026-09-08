# Verity audit — 2026-09-07

Four files. Read them in this order.

| File | What it is |
|---|---|
| [`FINDINGS.md`](FINDINGS.md) | 36 findings, ranked, each with a reproduction, the observed and expected behaviour, the authority it violates, and a confidence rating. Executive summary at the top. |
| [`ATTEMPTED-AND-FAILED.md`](ATTEMPTED-AND-FAILED.md) | Everything that was tried and correctly refused — tenant isolation, immutability, secrets, business rules, the HQ boundary, the agent channel. This is the evidence the guards work, and it is longer than the findings' Critical section. |
| [`COVERAGE.md`](COVERAGE.md) | All 206 registered command and query keys, marked exercised / source-reviewed / untested with a reason. Plus the route and API coverage, and an honest list of what was not tested. |
| [`METHOD-GAPS.md`](METHOD-GAPS.md) | Which findings only the source could reveal, which only the running application could, and where the two disagreed. |

**Nothing was changed.** No repository file outside `audit/` was touched, no command was executed
against the database, no form was submitted. Probe scripts and captured output live in
`audit/_probe/`, which is gitignored.

**The environment is production data.** `.env` points the local application at the same Supabase
project that serves `app.theverityai.xyz`. Every read in this audit went through the ordinary
`verity_app` runtime role, under RLS.

## Severity distribution

| Severity | Count | Findings |
|---|---|---|
| Critical | 3 | F-001, F-002, F-023 |
| High | 14 | F-003, F-004, F-005, F-007, F-008, F-009, F-010, F-012, F-015, F-024, F-025, F-028, F-031, F-033 |
| Medium | 13 | F-006, F-011, F-013, F-014, F-016, F-017, F-018, F-019, F-026, F-029, F-034, F-035, F-037 |
| Low | 7 | F-020, F-021, F-027, F-030, F-032, F-036, F-038 |
| Informational | 1 | F-022 |

## If only three things get fixed

1. **F-002** — set-wise exposure instead of the per-customer loop. It makes five screens work
   again and stops one tenant starving the others.
2. **F-023** — one `confirmation` filter in `gstr3bWorking` and `itcReconciliation`. It is a
   filed-return correctness defect and the fix already exists twice in the same repository.
3. **F-003/F-004** — a grant-ceiling check on `assignRole`, `invitePerson` and `grantPermission`.
   Without it, "may add a colleague" means "may become the Owner".
