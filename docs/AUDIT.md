# Verity — Platform Audit

**Date:** 2026-08-10 · **Scope:** whole repository at `fe04b83`+
**Method:** static review of all 384 source files, plus measured timings against
the live database. Every number below was measured, not estimated.

Findings are ordered by what I would fix first, not by category.

---

## Scale

| | |
|---|---|
| Source files | 384 |
| Routes (`page.tsx`) | 67 |
| Server-action modules | 54 |
| Prisma models | ~90 |
| Tests | 217, in 17 files |

---

## 1. Security

### 1.1 `uploadStorageImage` is an unauthenticated upload endpoint — **HIGH**

`src/server/actions/storage.ts` is a `"use server"` module, so every export is a
public POST endpoint. Its single export takes a base64 payload and writes it to
the storage bucket, with no session check anywhere in the call path:

```ts
"use server";
export async function uploadStorageImage(input: StorageUploadInput) {
  return uploadStorageImageImpl(input);   // no auth, no size cap, no tenant
}
```

The bucket is deliberately **public** (`lib/storage/upload.ts` notes the app
stores `getPublicUrl()` links). So anyone who can reach the app can write
arbitrary files to public storage and get a durable public URL back.

Consequences, roughly in order of likelihood: storage cost, bandwidth cost,
using your domain to host someone else's content, and — because the bucket is
public and the app renders these URLs as images — a stored-content vector.

**Fixed.** The action now requires a session and rewrites the object key under
the caller's own `factories/<factoryId>/` prefix, stripping any tenant segment
and traversal the client supplied. That second part matters independently:
`upsert: true` means a chosen path is a write to *someone's* existing object,
so authentication alone would still have let one tenant overwrite another's
evidence. Size and MIME are already checked by `validateUploadFile`.

### 1.2 `spec.ts` exposes three unauthenticated cross-tenant reads — **MEDIUM**

`fetchResolvedFields(groupId)`, `fetchReferenceOptions(fieldId)` and
`fetchFieldValueSuggestions(fieldId)` are `"use server"` exports that take an id
and return data with no session check and no tenant filter. An id from one
tenant returns that tenant's field definitions, option lists and previously
entered values to any caller.

This is product metadata rather than operational data, so it is a smaller leak
than tickets or invoices — but it is still one tenant's configuration readable
by anyone with an id.

**Fixed.** Each entry point resolves the session and confirms the group or field
belongs to the caller's factory before reading.

### 1.3 What is already right

Worth recording, because these were the things most likely to be wrong:

- **`orderItemResolver.ts` takes `factoryId` as a parameter and is deliberately
  *not* a `"use server"` module** — there is a comment saying exactly why. That
  is the correct call; had it been one, the caller would have chosen the tenant.
- **HQ actions are all guarded.** All twelve cross-tenant actions in `hq.ts`
  call `requireHqAction()`. They had no guard at all until `d95b5c8`; at that
  point `getClientsList()` would enumerate every tenant for any caller.
- **`verify.ts` is public by design** — the passport QR endpoint. Correct.
- **No raw SQL** in application code (`$queryRawUnsafe` appears only in
  throwaway scripts), so there is no SQL-injection surface.
- **Tenant scoping is consistently applied** in the service modules: every
  query in the six new action files filters on `factoryId`, and detail lookups
  use `findFirst({ where: { id, factoryId } })` rather than `findUnique` plus a
  post-hoc check.

---

## 2. Performance

### 2.1 Region mismatch is the dominant cost — **HIGH**

Measured against the live database:

```
median round trip        221 ms
6 sequential queries     1366 ms
6 parallel queries        626 ms
```

The database is Supabase `ap-south-1` (Mumbai). Vercel's default function
region is `iad1` (Washington DC). An owner page makes ten to fifteen round
trips, so it spends **two to three seconds waiting on the network** — which is
exactly the "loader is long, site is slow" symptom.

Queries themselves are single-digit milliseconds. No query optimisation moves
this number; only co-location does.

**Fixed:** `vercel.json` pins functions to `bom1`, and the region was applied on
the deployment on 2026-08-10. Re-measure from the deployed app to confirm the
2-3s figure has collapsed; the local numbers in §2.2 were never the ones that
mattered for a Vercel-hosted user.

### 2.2 A single query cost 2.4 seconds — **FIXED**

`salesOrderInclude` nests seven relations deep, and Prisma's default strategy
issues a round trip per level:

```
salesOrder.findMany + include    2442 ms
every other dashboard query      ~220 ms
```

Enabled the `relationJoins` preview feature and opted the deep-include queries
into `relationLoadStrategy: "join"` — one `LATERAL JOIN` instead of eleven
trips. Verified the join returns byte-identical trees before switching.

Measured on a local production build:

| Page | Before | After |
|---|---|---|
| `/owner/dashboard` | 2.70s | **0.77s** |
| `/owner/production` | — | 1.02s |
| `/owner/qc-floor` | — | 0.75s |
| `/owner/sites` | 0.34s | 0.24s |
| `/owner/helpdesk` | 0.33s | 0.22s |

### 2.3 Repeated identical reads — **FIXED, with a caveat**

Entitlements, the session→org mapping and role grants were re-fetched five or
six times per request. Now held in `lib/server/ttl-cache.ts` with explicit
invalidation on every writer.

**Caveat:** this is a large win on a long-running server and a small one on
Vercel, where each invocation may be a fresh process with an empty cache. It
does not substitute for §2.1.

### 2.4 `connection_limit=1` — **FIXED locally, check the deployment**

`.env` pinned `connection_limit=1`, which overrode `lib/prisma.ts` (it only sets
the parameter when absent). Every request funnelled its concurrent queries
through one connection until the 20s pool timeout — the `P2024` error.

Removed locally. **On serverless, `connection_limit=1` is correct** and should
stay on the deployed `DATABASE_URL`.

### 2.5 `/owner/production` at ~1.0s — **OPEN**

The slowest page remaining. Not profiled. Likely the same nested-include shape
as the dashboard; worth the same treatment.

---

## 3. Correctness

### 3.1 Two silent-failure bugs found and fixed

Both had the same shape — duplicated logic that drifted — and both failed with
no error anywhere:

- **`prisma/seed.ts` carried its own copy of `hashPin`** and drifted to a
  `veda:` salt while `lib/server/hash.ts` moved to `verity:`. The seed wrote one
  hash and login computed another, so **every seeded account had been unable to
  log in**, reporting only "Invalid Phone Number or PIN". Repaired by
  `scripts/repair-legacy-pin-hashes.ts`.
- **`getMySchedule` and `requestSwap` were guarded by `getOwnerUser()`**, which
  redirects anyone below manager — the two actions written *for workers* were
  unreachable by workers.

**The pattern is the finding.** When the same logic exists in two places, make
one import the other. See §6.

### 3.2 The operator lived inside a client workspace — **FIXED**

The HQ operator was a user inside Carxen, a client. Renaming the operator left
that tenant without an owner. PlotArmour is now its own organisation with
Divyom Sharma as owner; Carxen keeps Yashu Malik.

### 3.3 Nav permissions carry a transitional carve-out — **OPEN**

Owners, co-owners and managers pass the registry permission check without
holding the key, because those keys entered `DEFAULT_GRANTS` after some tenants
were provisioned. `scripts/backfill-role-grants.ts --apply` has now been run, so
**the carve-out in `owner-shell.tsx` can be deleted** — it is dead weight that
weakens the gate.

---

## 4. Test coverage — **the largest structural gap**

217 tests, all pre-existing. **Zero cover the ~40 new server actions** across
sites, helpdesk, projects, assets, scheduling, billing and service quality.

The specific thing that should be tested and is not: **tenant isolation**. Every
action claims to filter on `factoryId`; nothing asserts it. A single missed
filter is a cross-tenant data leak, and it would pass review because the code
looks like every other action.

**Recommendation:** one table-driven test that, for each action, seeds two
tenants and asserts tenant A cannot read or write tenant B's row. That single
test is worth more than unit tests of each action's happy path.

---

## 5. Verification debt

Stated plainly because it affects how much the rest of this document is worth:

- **Nothing in this codebase has been verified visually.** The browser pane
  could not be displayed in any session, so UI work is confirmed by DOM,
  computed styles and generated PNGs — never by looking at it.
- **The logo is a vector reconstruction**, not the supplied raster. It was
  corrected across three passes by rendering and inspecting the PNG, but it is
  an interpretation.
- **An orphaned `<div id="S:0">` duplicate tree** appears on every page. It
  reproduces on an unmodified checkout, so it predates this work. Cause
  undetermined; harmless visually but it doubles the DOM.

---

## 6. The recurring theme

Three separate bugs this cycle had one cause: **the same logic written twice and
allowed to drift.**

- `hashPin` in `seed.ts` vs `lib/server/hash.ts` → every login broken
- `VerityLogo` vs `icon.tsx` drew entirely different shapes
- `DEFAULT_GRANTS` needed by both a server-only module and a plain script

Each was fixed by making one the source and the other import it
(`default-grants.ts`, `provision-core.ts`, shared icon paths). The rule worth
adopting: **if it must be identical in two places, it must be one export.**

---

## Priority

| # | Item | Status |
|---|---|---|
| 1 | §1.1 authenticate `uploadStorageImage` | **fixed** — session + tenant-anchored key |
| 2 | §2.1 co-locate functions with the database | **fixed** — `bom1` applied on the deployment |
| 3 | §1.2 scope the three `spec.ts` reads | **fixed** — session + ownership check |
| 4 | §4 one tenant-isolation test across the new actions | **open** — largest remaining gap |
| 5 | §3.3 delete the RBAC carve-out (backfill has run) | open |
| 6 | §2.5 profile `/owner/production` | open |
| 7 | §5 verify the UI visually | open — never done in any session |
