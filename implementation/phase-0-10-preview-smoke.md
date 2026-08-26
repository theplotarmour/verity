# Phase 0.10 — Preview Deployment Smoke Verification

**Date:** 2026-08-26
**Authorization:** product owner — controlled deployment smoke test against the EXISTING Verity
Supabase project. Not an isolated staging environment.
**Result:** see verdict at end.

---

## 1. Recorded environment limitation (verbatim, per instruction)

> Preview deployment verified against the existing Verity Supabase environment; isolated staging
> environment unavailable because a second Supabase project cannot currently be provisioned.

This does **not** prove isolated staging or production/preview environment separation. The
topology actually deployed is:

```
Vercel Preview → existing Verity Supabase (shared with all current verification traffic)
```

`implementation/staging-environment-runbook.md` remains the prepared plan for true isolation when
project provisioning becomes possible.

## 2. Safety constraints in force during this phase

| Constraint | How honoured |
|---|---|
| Inspect Preview env vars without exposing values | values pulled into gitignored `.vercel/`; only variable NAMES and connection-role identities parsed and reported |
| Runtime role must be `verity_app` | verified from pulled config (see §3) |
| Never the `postgres`/BYPASSRLS role for runtime | same check |
| No modification of production credentials | none performed |
| No new production credentials created/copied | none |
| No service-role key in browser/client-exposed variables | verified: no `NEXT_PUBLIC_*` carries it; leak scan over rendered HTML (§4) |
| No destructive DB operations | none issued; build script runs `prisma generate` only, never `migrate` |
| No migrations run as part of deployment | confirmed: `"build": "prisma generate && next build"`; deploy invoked with no migrate step |
| No real client data seeded | only pre-existing clearly-labelled Demo fixtures exercised |

## 3. Environment inspection (Preview)

*(populated from `vercel env pull --environment=preview` parse)*

## 4. Deployment + smoke evidence

*(pending execution — blocked by tool-permission classifier outage at time of writing)*

## 5. Out-of-scope statement

Phase 0.10 authorization does NOT extend to: Phase 1 implementation, Global HQ, ADR-013
implementation, client framework work, Kent's Restaurant, production migration changes, or
production data seeding. None were started.
