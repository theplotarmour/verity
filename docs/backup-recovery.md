# Verity — Backup & Recovery Runbook

> Satisfies the PRD's backup/recovery acceptance item. Covers the production
> Postgres database (Prisma Postgres / `db.prisma.io`) and Supabase Storage
> (image evidence). Keep this file current whenever infra changes.

## What must be backed up

| Asset | Store | Contains | Loss impact |
|---|---|---|---|
| Application database | Postgres (`DATABASE_URL`) | All orders, production, QC, inventory, users, audit log | Total — the whole factory record |
| Image evidence | Supabase Storage bucket (`STORAGE_BUCKET`) | Stage/QC before-after photos, passports | High — QC proof lost |
| Secrets | Vercel env vars | DB/JWT/storage/notification keys | Redeploy-blocking |

## Database backups

### Automated (preferred)
- Prisma Postgres / managed Postgres providers keep automated daily snapshots with
  point-in-time recovery. Confirm retention is **≥ 7 days** in the provider console
  and that PITR is enabled.

### Manual / off-site snapshot (weekly, and before every schema change)
```bash
# Full logical dump (schema + data). Uses DIRECT_URL to bypass the pooler.
pg_dump "$DIRECT_URL" --no-owner --format=custom --file="verity-$(date +%F).dump"

# Restore into a fresh database
pg_restore --no-owner --clean --if-exists --dbname="$TARGET_DATABASE_URL" verity-YYYY-MM-DD.dump
```
Store the dump off the primary provider (e.g. encrypted object storage). Verify a
restore into a scratch database at least once a month — an untested backup is not a backup.

### Schema changes
- The build currently runs `prisma db push --accept-data-loss`. **Always take a
  manual dump immediately before merging a schema change to master.**
- Planned hardening (Milestone 8.6): move to committed migrations + `prisma migrate
  deploy` so schema history is versioned and rollbackable.

## Storage (image evidence) backups
- Enable versioning/retention on the Supabase Storage bucket if available.
- Periodic mirror:
  ```bash
  # Requires the Supabase CLI, authenticated to the project
  supabase storage cp --recursive "ss:///$STORAGE_BUCKET" ./storage-backup-$(date +%F)
  ```
- Ledger/DB rows reference storage by `publicUrl`/`storageKey`; a DB restore is only
  complete if the matching objects still exist in the bucket.

## Secrets
- Vercel env vars are the source of truth. Keep an encrypted copy of the required set
  in a password manager:
  `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, Supabase keys, `MAINTENANCE_TOKEN`,
  and (optional) `RESEND_API_KEY` / `NOTIFY_EMAIL_FROM` / `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID`.

## Recovery procedure (database loss)
1. Provision a new Postgres database.
2. Restore the most recent verified dump (`pg_restore`, above) — or use the provider's
   PITR to the last-good timestamp.
3. Point `DATABASE_URL` / `DIRECT_URL` (and the `POSTGRES_URL` / `PRISMA_DATABASE_URL`
   aliases) at the restored database in Vercel.
4. Redeploy. The build runs `prisma generate && prisma db push` to reconcile schema.
5. Smoke test: owner login (`9971907190`), open Inventory / Production / QC Floor /
   Reports; confirm recent orders and stock are present.
6. If image URLs 404, restore the storage mirror into the bucket.

## Recovery drill cadence
- **Monthly:** restore latest dump into a scratch DB + spot-check row counts.
- **Quarterly:** full DR rehearsal (DB + storage) into a staging project.

## Maintenance endpoints (destructive — token-gated)
`/api/reseed-catalog`, `/api/seed-owner`, `/api/backfill`, `/api/delete-productions`
all require `?token=$MAINTENANCE_TOKEN`. Never expose the token; unset it in prod to
disable these endpoints entirely.
