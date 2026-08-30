# Operating Verity

**Task 42.**

## Daily

```bash
./deploy/scripts/health.sh          # liveness, readiness, container status
./deploy/scripts/backup.sh          # dump, verified by reading it back
```

## Backups

`backup.sh` writes a custom-format dump to `deploy/backups/`, then reads it with
`pg_restore --list` before reporting success, and refuses a dump under 1KB. A
dump nobody has read is not a backup.

Schedule it, and **copy the dumps off the host** — a backup on the same disk as
the database survives exactly the failures that do not matter.

### Restoring

```bash
VERITY_RESTORE_CONFIRM=yes ./deploy/scripts/restore.sh deploy/backups/verity-<stamp>.dump
```

Destructive. It stops the application first, because restoring under a live
application produces a half-restored database and a very confusing incident.

## Observability

| Question | Where |
|---|---|
| Is it alive? | `GET /api/health` — no I/O, so a database outage cannot answer "no" |
| Can it serve? | `GET /api/ready` — `SELECT 1`, reports its own duration |
| What is failing? | `GET /api/metrics` (requires `CRON_SECRET` in production) |
| Which request? | the `correlationId` on every log line — the same id on the audit rows |
| Which deployment? | `service`, `version`, `commit`, `environment` on every line and both probes |

Logs are JSON lines on stdout: `docker compose logs -f web`.

Metrics are **per instance and reset on restart**. With more than one replica,
scrape each.

## Reading the audit trail

Every mutation writes field-level changes to `activity` and facts to
`domain_event`, correlated by one id per command. Secret-shaped fields record
that they changed and never what they changed to.

Both tables refuse `UPDATE` for every role, including a privileged one, and
refuse `DELETE` for the application role. Retention needs a `BYPASSRLS`
connection, which the runtime never holds.

## A psql session

```bash
docker compose --project-name verity exec db psql -U postgres verity
```

The database publishes no host port. This is deliberate.

## Common problems

| Symptom | Cause |
|---|---|
| `/api/ready` returns 503 | database unreachable; `docker compose logs db` |
| `E_STORAGE_UNAVAILABLE` | no storage driver bound — check `VERITY_STORAGE_DRIVER` and its variables |
| `SignatureDoesNotMatch` from S3 | almost always `VERITY_S3_FORCE_PATH_STYLE`, not the key |
| `E_CONFIG_INVALID` at boot | a required variable for the selected provider is missing; the message names it |
| Sign-in works, nothing is visible | the identity holds no membership — memberships are how a tenant is reached |
| Availability or SLA looks wrong | check `show timezone` on the database; it must be UTC |
