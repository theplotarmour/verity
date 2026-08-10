# Deploying Verity

The single largest performance factor is **where the serverless functions run
relative to the database**, not the code. Everything else in this file is
secondary.

## 1. Region — read this first

The database is Supabase `aws-1-ap-south-1` (Mumbai). Vercel's default function
region is `iad1` (Washington DC). Every query then crosses the Atlantic and the
Middle East and back.

A measured round trip on that path is ~220ms. An owner page issues roughly ten
to fifteen of them, so the page spends **two to three seconds waiting on the
network** while the loader sits on screen. No amount of query optimisation moves
that number, because the queries themselves take single-digit milliseconds.

`vercel.json` pins functions to `bom1` (Mumbai), next to the database.

**This only takes effect on redeploy.** Confirm afterwards in the Vercel
dashboard under a function's detail — it should read Mumbai, not Washington.

If the app ever needs to serve users far from India, move the *database* and the
functions together rather than splitting them. Co-location is what matters; the
absolute location matters much less.

## 2. Environment variables

`.env` is gitignored, so **nothing in it reaches a deployment**. Every variable
below must be set in the Vercel project settings, or the feature that depends on
it silently does nothing.

| Variable | Required | What breaks without it |
|---|---|---|
| `DATABASE_URL` | yes | Nothing runs |
| `DIRECT_URL` | yes | Migrations fail |
| `JWT_SECRET` | yes | Sessions fail closed in production |
| `VERITY_HQ_PHONES` | for HQ | `/verity` admits nobody, by design |
| `NEXT_PUBLIC_SITE_URL` | for links | Invite and passport links point at the wrong host |
| `DATABASE_POOL_LIMIT` | no | Defaults to 5 |
| `MAINTENANCE_TOKEN` | for `/api/*` maintenance | Those endpoints refuse every request |

### `VERITY_HQ_PHONES`

Comma-separated operator phone numbers. Empty or unset **admits nobody**, in
every environment — that is deliberate, not a bug, but it is also the single
most common reason `/verity` appears broken after a deploy.

```
VERITY_HQ_PHONES=7011440350
```

### `DATABASE_URL` on serverless

Keep `?pgbouncer=true&connection_limit=1` on the deployed value. One connection
per invocation is correct for serverless, where many short-lived instances each
open their own pool. The local `.env` drops the limit because a single
long-running dev server benefits from more.

## 3. What does not help on serverless

`src/lib/server/ttl-cache.ts` holds entitlements and grants between requests.
That is a large win on a long-running server and a small one on Vercel, where
each invocation may be a fresh process with an empty cache. It is not wasted —
warm instances handle consecutive requests — but do not expect it to substitute
for co-location.

## 4. After deploying, verify rather than assume

```bash
# Is HQ configured on this deployment?
npx tsx scripts/check-hq-access.ts

# Are role grants current for every tenant?
npx tsx scripts/backfill-role-grants.ts
```

Both are read-only until passed `--apply`.
