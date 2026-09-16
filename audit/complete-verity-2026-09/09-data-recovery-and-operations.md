# Data Recovery and Operations

## Verdict

**NOT READY.** Backup creation has a useful archive-list verification, but the automated restore can ignore database errors and then declare success based on a readiness endpoint that checks only `SELECT 1`. The detailed runbook and scripts describe different backup products and restore orders.

## Backup/restore comparison

| Concern | Runbook | Script | Audit result |
|---|---|---|---|
| Backup scope | `--data-only`, excludes migration ledger/config/roles | full custom-format `pg_dump -Fc` | DOCS CONTRADICTION |
| Target preparation | fresh DB; migrate first; restore data second | restore into existing DB with `--clean --if-exists` | DOCS CONTRADICTION |
| Trigger handling | explicit handling for named capability dependency trigger | generic full restore | PARTIAL/unclear |
| Restore errors | inspect non-zero/error summary; do not declare complete | `pg_restore ... || warn` | FAIL |
| Post-restore check | counts and application verification | restart + `/api/ready` | FAIL; readiness proves only DB reachability |
| Config/secrets/IdP state | separate backup required | not included | documented but no automated recovery |
| Restore rehearsal | historical claims exist | no current isolated run | UNTESTED |

## Failure path

1. Operator invokes `restore.sh` after an incident or failed upgrade.
2. `pg_restore` encounters ownership, schema, trigger, ordering, or data errors and returns non-zero.
3. Script converts failure to a warning and continues.
4. Application restarts; `/api/ready` succeeds because PostgreSQL answers `SELECT 1`.
5. Script prints `restore complete` although business rows, grants, functions, policies, or configuration may be incomplete.

This is a P1 recovery defect because it converts a detectable restore failure into a false operational success during the moment data integrity matters most.

## Recovery coverage gaps

- No current recovery-time or recovery-point objective.
- No current backup retention/encryption/off-host replication policy.
- No automated verification of row counts, tenant isolation, RLS/FORCE RLS, grants, functions, triggers, migration ledger, storage objects, or external identity mapping after restore.
- No object-store backup/restore pairing with DB file metadata.
- No tested secret/config recovery or rotation-after-restore playbook.
- No point-in-time recovery/WAL archival procedure.
- No tenant export/offboarding/deletion-verification procedure proving data erasure across DB, objects, logs, and IdP.

## Operations and observability

| Control | Status |
|---|---|
| Liveness/readiness | BUILT; runtime observed |
| Auth/storage readiness | intentionally absent; operational blind spot |
| Protected metrics | BUILT; unauth 401 observed |
| Central metrics/log collection | deployment-dependent, not packaged |
| Scheduler monitoring | GitHub job detects non-ok outcomes; no local equivalent |
| Structured log redaction | BUILT/pure tests pass |
| Normal auth-denial log noise | PRESENT; stack traces for expected unauth access |
| Alerting/runbook integration | PARTIAL |
| Capacity/performance baseline | NOT ESTABLISHED |

## Retest required

On an isolated current schema: create representative tenants/files/events, take the supported backup, destroy the target, restore with a deliberately injected failure, prove fail-closed behavior, then restore successfully and verify data counts, relationships, RLS, grants, functions, triggers, file access, authentication mapping, scheduled work, and application workflows. Record RTO/RPO and artifact checksums.

