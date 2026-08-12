# Migrations

## The short version

**Use `npm run db:sync` (`prisma db push`). Do not run `prisma migrate dev`.**

This database has been managed with `db push` since it was created. The migration
directory is history, not the source of truth.

## What was wrong, and what was fixed

`_prisma_migrations` **did not exist**. The four migrations in `prisma/migrations/`
had never been recorded as applied, while the live database held every table they
describe and a great deal more.

That combination is the dangerous one. `prisma migrate dev` reads an empty history,
concludes the database is brand new, tries to create tables that already exist,
fails, and then offers a `--force-reset` — which drops the schema and every row in
it. On a live Supabase instance with real tenants, one accepted prompt is the whole
dataset.

Fixed by baselining, which writes bookkeeping only and touches no schema and no
data:

```bash
npx prisma migrate resolve --applied 00000000000000_baseline
npx prisma migrate resolve --applied 20260727000000_init
npx prisma migrate resolve --applied 20260727020000_tenant_rls
npx prisma migrate resolve --applied 20260728000000_domain_blueprints
```

`prisma migrate status` now reports **"Database schema is up to date!"** — nothing
pending, and no replay of `init` onto existing tables.

## What is still true, and why `migrate dev` is still wrong

`migrate status` compares *migrations applied* against *migrations on disk*. It does
not compare either against the actual schema. It cannot tell you the history is
complete, only that it is not behind.

The history is **not** complete. Everything added by `db push` after
`20260728_domain_blueprints` exists in no migration — `MenuCategory` and `MenuItem`
are the newest examples, and `grep -ri MenuCategory prisma/migrations/` returns
nothing.

So `migrate dev` would still be unsafe, for a different reason than before: it
replays the migration history into a shadow database, diffs that against the real
one, finds tables with no migration behind them, reports **drift detected**, and
again offers a reset.

Closing that gap properly means one squash migration representing the current schema
and retiring the four it supersedes — otherwise a from-scratch replay creates the
same tables twice. That needs a shadow database and a decision about whether
migration history is worth maintaining at all on a project that has not used it.
Deliberately not done here; baselining was the safe half, and it is the half that
removes the loaded gun.

## Adding a table

1. Edit `prisma/schema.prisma`.
2. `npm run db:sync`.
3. Read the output. `db push` warns before anything destructive — a dropped column
   or a unique index on a populated column. Inspect the affected rows before
   accepting; on this database the answer is usually "don't".
4. `npx prisma generate` if the client is stale.

## Never on the live database

- `prisma migrate dev` — see above.
- `prisma migrate reset`, `db push --force-reset`, `npm run db:reset` — all drop
  everything. `db:reset` reseeds afterwards, which makes it look survivable. It is
  not: the seed is demo data, not a backup.
