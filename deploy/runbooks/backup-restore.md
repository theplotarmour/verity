# Verity Backup and Restore Runbook

This runbook and `deploy/scripts/{backup,restore}.sh` define one supported
contract: a **full PostgreSQL 16 logical archive restored into a newly-created,
empty PostgreSQL 16 database**. The archive carries schema, migrations, RLS,
functions, grants, and application data. Do not migrate before or after this
restore unless a separately tested upgrade procedure explicitly requires it.

## Scope and current limitation

The database artifact is verified and checksummed. The manifest records source
commit/version, PostgreSQL major, migration count, tenant count, size, and
checksum without copying live secrets.

Object-store bytes are not yet exported by this script. A database archive with
`object_store_status=not_included` is **not a complete recovery set** when the
deployment uses files. Pair it with a provider-native versioned snapshot/export
from the same maintenance window and retain both under one off-host encrypted
backup-set identifier. Do not claim the WP-07 recovery gate complete until the
paired object restore and reference/hash checks have passed.

Identity-provider configuration and `deploy/config/verity.env` must be backed
up separately in the organization's secret manager. Never place plaintext live
secrets next to database dumps.

## Create a database backup

```bash
./deploy/scripts/backup.sh
```

The script writes:

- `verity-<UTC timestamp>.dump`, mode 0600;
- `verity-<UTC timestamp>.dump.manifest`, mode 0600.

It writes the archive through a `.partial` name, verifies it using the
PostgreSQL 16 container's own `pg_restore --list`, calculates SHA-256, and only
then reports success. Move the dump, manifest, and paired object snapshot to
encrypted off-host storage. Retention, key rotation, RPO, and RTO require an
owner-approved policy and measured rehearsal; this repository does not invent
business values for them.

## Restore

Restore only into the Compose deployment named by this package. Confirm that
the corresponding object-store snapshot and protected provider configuration
are available before destructive recovery.

```bash
VERITY_RESTORE_CONFIRM=yes \
  ./deploy/scripts/restore.sh deploy/backups/verity-<timestamp>.dump
```

The state machine is fixed:

1. Require and parse the adjacent manifest.
2. Verify format, PostgreSQL major, SHA-256, and archive readability before
   touching the target.
3. Stop both web and scheduler.
4. Drop and recreate the target database.
5. Restore with `pg_restore --exit-on-error`; any object error terminates.
6. Mark the restored database `quarantined` before any application starts.
7. Verify the runtime role cannot bypass RLS, constraints are validated, RLS
   tables and policies exist, migrations are complete, timezone is UTC, and the
   tenant count matches the manifest.
8. Release quarantine explicitly, then start web and scheduler.
9. Require profile-aware readiness, including the new scheduler heartbeat.

Any failure after services stop leaves web and scheduler stopped. The operator
must inspect the error and restart from a clean target; never hand-edit a
partially restored database and never clear quarantine merely to regain traffic.

## Required checks before incident closure

The automated script is a minimum structural gate, not complete certification.
Before declaring recovery complete, archive evidence for:

- manifest and database/object checksums;
- migration ledger and schema fingerprint;
- source/target row-count reconciliation for every application table;
- foreign keys, uniqueness, indexes, triggers, sequences, extensions, RLS,
  grants, definer owners/ACLs/search paths, and runtime role attributes;
- database `StoredFile` references against restored object keys, sizes, and a
  sampled content-hash set;
- identity subject-to-user/membership mappings;
- authenticated representative tenant flow and hostile cross-tenant denial;
- every scheduler cadence, idempotent restart, and no stale backlog;
- measured restore time and recovered-data age against approved RTO/RPO.

## Failure injection

In an isolated rehearsal, prove each case exits non-zero and never starts web or
scheduler: truncated dump, checksum mismatch, missing manifest, wrong PostgreSQL
major, injected `pg_restore` object error, missing object snapshot, bad grants or
RLS, unavailable IdP/storage, tenant-count mismatch, and failed readiness after
service restart.

## Upgrade rollback

`upgrade.sh` takes the backup before build or migration and restarts both web
and scheduler. A database restore is the rollback boundary for an incompatible
schema. Never roll old application code across a migrated schema unless the
release manifest explicitly marks that schema backward compatible and the exact
pair has passed acceptance.

The current scripts and static verification improve failure behavior, but the
formal recovery gate remains open until a blind database-plus-object restore and
failure-injection matrix pass against an exact release artifact.
