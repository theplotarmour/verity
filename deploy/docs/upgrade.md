# Upgrading Verity

**Task 42.**

```bash
git pull
./deploy/scripts/upgrade.sh
```

## What it does, in this order

1.  **Backup.** First, always. If it fails the upgrade aborts and nothing has
    changed. An upgrade path whose first action is not a backup is not an
    upgrade path.
2.  **Build** the new image.
3.  **Migrate.** `prisma migrate deploy` applies only migrations present in the
    repository and never generates one, so an upgrade cannot invent a schema
    change on your database.
4.  **Restart** the application.
5.  **Verify** health, and print the rollback command if it fails.

## Rolling back

```bash
git checkout <previous tag>
./deploy/scripts/migrate.sh          # only if the new version added migrations
VERITY_RESTORE_CONFIRM=yes ./deploy/scripts/restore.sh deploy/backups/verity-<stamp>.dump
```

**Migrations are forward-only.** Prisma has no down-migrations here by design: a
generated rollback is a script nobody has tested, run at the worst moment. The
tested path back is the backup taken in step 1, which is why step 1 is step 1.

## Before upgrading a production deployment

*   Read the migration SQL: `git diff <old>..<new> -- prisma/migrations/`.
*   Confirm the last backup restores — into a scratch database, not by faith.
*   Upgrade a staging deployment first if one exists.

## Zero downtime

Not supported, and deliberately not claimed. One application container is
restarted, so there is a gap of a few seconds. A deployment that needs no gap
runs two replicas behind the reverse proxy and restarts them in turn — the
application is stateless, so nothing prevents it, but the package does not
pretend to orchestrate it.
