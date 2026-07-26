# Verity — Performance Audit
*Research-only. No code changes made.*

---

## Executive Summary

Three distinct performance failure modes were found:

| # | Category | Impact | Root Cause |
|---|----------|--------|------------|
| 1 | **Page load latency** | High | Sequential/missing parallelism in server data fetches; deeply nested Prisma includes; two heavy page queries fire on every navigation |
| 2 | **Save-then-reload loop** | High | Every mutation calls `router.refresh()` which re-runs the entire RSC tree of the current page; compounded by SSE `LiveRefresh` that fires another `router.refresh()` within ~1 s from the same mutation |
| 3 | **N+1 DB queries** | Medium-High | Bulk import loops, `bulkImportVehicles`, `importMasterCsv`, `importMasterCsvExtra` each issue 5–10 sequential round-trips **per CSV row** with no batching |

---

## 1. Slow Page Loading

### 1.1 `/owner/production` — the heaviest page

**File:** [`page.tsx`](file:///d:/Code/verity/src/app/owner/production/page.tsx)

Fires **four** parallel `Promise.all` calls:

```
getMasterData()         → 12 separate prisma.findMany() calls (sequential, not batched)
getRunningOrders()      → prisma.salesOrder.findMany with salesOrderInclude (deep 6-level include)
prisma.inspection.findMany  → includes jobCardInclude (another 5-level nested include)
prisma.qCTemplate.findFirst → includes sections → checkpoints
```

**`getMasterData()` in [`orders.ts#L88-L136`](file:///d:/Code/verity/src/server/actions/orders.ts#L88-L136) issues 12 sequential (not parallel) queries:**

```ts
// Each of these runs ONE AFTER ANOTHER — no Promise.all
const brands = await prisma.vehicleBrand.findMany(...)
const models = await prisma.vehicleModel.findMany(...)
const productCategories = await prisma.productCategory.findMany(...)
const products = await prisma.product.findMany(...)
const productVariants = await prisma.productVariant.findMany(...)
const materials = await prisma.itemMaster.findMany(...)
const designs = await prisma.design.findMany(...)
const colors = await prisma.color.findMany(...)
const workers = await prisma.user.findMany(...)
const inspectors = await prisma.user.findMany(...)
const customers = await prisma.customer.findMany(...)
const combinations = await prisma.productCombination.findMany(...)
const productTypes = await prisma.productType.findMany(...)
const workflowStages = await prisma.workflowStage.findMany(...)
```

**14 round-trips that could be one `Promise.all([...])`**. At 10–30 ms per DB round-trip on Supabase/Neon that's 140–420 ms of avoidable serial latency — before the page renders a single byte.

---

### 1.2 `/owner/settings` — 15 unconstrained queries

**File:** [`page.tsx`](file:///d:/Code/verity/src/app/owner/settings/page.tsx#L16-L40)

```ts
const [...] = await Promise.all([
  prisma.vehicleBrand.findMany(...)                  // ✅ parallel
  prisma.vehicleModel.findMany(..., include: { brand, generations: { years: { variants } } }) // ⚠️ 4-level deep include
  prisma.productVariant.findMany(..., include: { blueprint: { versions: { bom: { items } } } }) // ⚠️ 5-level deep include
  // ... 12 more
])
```

These ARE parallel (inside `Promise.all`), which is good, but the deep nested includes on `vehicleModel` and `productVariant` cause Postgres to generate JOINs across 4–5 tables per row. If there are 100+ vehicle models, this could return megabytes of hydration data through the RSC wire.

**`productVariant` query** fetches every blueprint, every version of every blueprint, every BOM, and all BOM items — for **all variants** — on every Settings page visit. This is almost certainly the single slowest query in the codebase.

---

### 1.3 `/owner/dashboard` — N sequential queries inside a `.then()`

**File:** [`page.tsx`](file:///d:/Code/verity/src/app/owner/dashboard/page.tsx#L71-L84)

```ts
prisma.attendanceLog.findMany(...)
  .then((logs) =>
    prisma.user.findMany({   // ← second query fires AFTER first resolves
      id: { in: logs.map(...) },
    })
  )
```

This nested `.then()` is inside a `Promise.all`, but it still serialises two DB round-trips. The outer `Promise.all` resolves no faster than both sequential queries — effectively one hidden waterfall inside a parallel block.

**`salesOrderInclude`** ([`jobCardAdapter.ts#L80-L120`](file:///d:/Code/verity/src/lib/server/jobCardAdapter.ts#L80-L120)) is a 6-level deeply nested Prisma include object used on **every** order query across dashboard, production, floor, and QC pages. It pulls inspection submissions, reports, job cards, blueprint versions, product variants, fitments, and brands in a single query — often when the caller only needs 2–3 of those fields.

---

### 1.4 `getOwnerUser()` — Prisma query per Server Action call

**File:** [`owner.ts`](file:///d:/Code/verity/src/lib/server/owner.ts)

```ts
export const getOwnerUser = cache(async () => {
  const session = await getUserSession();  // decrypt JWT cookie
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { factory: true }             // always fetches full factory row
  });
  return dbUser;
});
```

`React.cache()` deduplicates within a **single RSC render pass**, but `getOwnerUser` is called by every server action independently. In a single page that calls `getMasterData()`, it's called once. But in a page like `/owner/production` that also runs mutations (e.g., `createOrder` → `issueMaterialsForWorkOrder` → `notifyLowStock` each calling `getOwnerUser`), it can fire several times per request cycle. `include: { factory: true }` means every call re-fetches the entire factory row + JSON settings blob.

---

## 2. Save-and-Reload Issues

This is the most user-visible problem and has **two independent triggers compounding each other.**

### 2.1 Trigger A — `router.refresh()` on every save

**38 call-sites** across the codebase call `router.refresh()` synchronously after a mutation succeeds:

```
MasterSheetView.tsx  → 8 calls  (after each add/remove/import)
production/client.tsx → 2 calls
settings/client.tsx   → 6 calls
purchase/client.tsx   → 7 calls
inventory/client.tsx  → 4 calls
inspector/review/*.tsx → 3 calls
worker/stage/*.tsx    → 2 calls
... and more
```

`router.refresh()` in Next.js App Router re-runs **all server components** on the current route segment — including all 14 sequential `getMasterData` queries. So clicking "Add Design" in Settings results in:

1. Server action fires → `addDesign()` → `revalidateMasterPaths()`
2. Client calls `router.refresh()`
3. Next.js re-fetches the entire `/owner/settings` page including all 15 `Promise.all` queries
4. **User sees a loading flash** while the heavy page re-hydrates

This means every single CRUD operation on `/owner/settings` triggers a full re-render of the most expensive page in the app.

---

### 2.2 Trigger B — SSE `LiveRefresh` fires a second `router.refresh()` ~1 s later

**File:** [`LiveRefresh.tsx`](file:///d:/Code/verity/src/components/providers/LiveRefresh.tsx)

```ts
const onChange = () => {
  pending.current = true;
  applyIfIdle();  // → router.refresh() if user not busy
};
```

**File:** [`stages.ts#L30-L38`](file:///d:/Code/verity/src/server/actions/stages.ts#L30-L38)

```ts
function revalidateStagePaths(factoryId?: string) {
  revalidatePath("/worker");
  revalidatePath("/owner/floor");
  revalidatePath("/owner/production");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/inventory");
  if (factoryId) publishChange(factoryId, "STAGE");  // ← fires SSE event
}
```

**Every stage mutation** (worker starts/completes a stage) calls `publishChange()`, which triggers the SSE `change` event on every connected browser tab of the same factory. `LiveRefresh` immediately calls `router.refresh()` on the production page, inventory page, dashboard — **regardless of what the user is doing**.

The sequence on the owner's machine when a worker submits a stage:
1. Worker calls `completeStage()` server action
2. `revalidateStagePaths()` → `publishChange(factoryId, "STAGE")`
3. Owner's `LiveRefresh` SSE listener receives `change` event
4. `router.refresh()` fires on `/owner/production`
5. The production page re-runs `getMasterData()` (14 queries), `getRunningOrders()` (1 deep-include query), and the inspection query

**This fires for every worker action on the floor — including stage starts, note additions, and image uploads.**

---

### 2.3 `revalidatePath` scope is too broad

**File:** [`masterData.ts#L10-L15`](file:///d:/Code/verity/src/server/actions/masterData.ts#L10-L15)

```ts
function revalidateMasterPaths() {
  revalidatePath("/owner/settings/master-data");
  revalidatePath("/owner/production");   // ← full production page cache busted
  revalidatePath("/owner/inventory");    // ← full inventory page cache busted
  revalidatePath("/owner/purchase");     // ← full purchase page cache busted
}
```

Called by **every** catalog mutation (addBrand, removeColor, addDesign, etc.). Adding a single color busts the cache of 3 heavy pages. Next.js then re-fetches those on the next visit.

---

### 2.4 `LiveRefresh` 3-second polling interval

**File:** [`LiveRefresh.tsx#L60`](file:///d:/Code/verity/src/components/providers/LiveRefresh.tsx#L60)

```ts
const settleTimer = setInterval(applyIfIdle, 3000);
```

This interval re-checks for a pending refresh every 3 seconds. If the user was briefly "busy" (in a modal) when a live event arrived, it will apply the `router.refresh()` 3 s later — even if the user is now in the middle of filling a form. The `isUserBusy()` check only catches an active `input/textarea/select` focus or an open `[role="dialog"]` — a user reading an order card is not considered "busy" and will get refreshed.

---

## 3. N+1 DB Query Patterns

### 3.1 `bulkImportVehicles` — 5 queries per vehicle row, sequentially

**File:** [`masterData.ts#L334-L356`](file:///d:/Code/verity/src/server/actions/masterData.ts#L334-L356)

```ts
for (const v of vehicles) {
  let brand = await prisma.vehicleBrand.findFirst(...)      // query 1
  if (!brand) brand = await prisma.vehicleBrand.create(...) // query 2 (conditional)
  let model = await prisma.vehicleModel.findFirst(...)      // query 3
  if (!model) model = await prisma.vehicleModel.create(...) // query 4 (conditional)
  let generation = await prisma.vehicleGeneration.findFirst(...) // query 5
  if (!generation) generation = await prisma.vehicleGeneration.create(...) // ...
  // + year, variant rows
}
```

For 50 vehicles: **250–500 sequential DB round-trips**. At a 20 ms round-trip this is 5–10 seconds of pure query time. The action has a `serverActions.bodySizeLimit` of 15 MB (for CSV), so large imports will time out.

### 3.2 `importMasterCsv` — find-then-create per row

**File:** [`masterData.ts#L476-L562`](file:///d:/Code/verity/src/server/actions/masterData.ts#L476-L562)

For each row of the CSV it does:
- `findFirst` to check existence
- `create` if not existing
- Conditional `findFirst + create` for parent categories

No batch upsert, no deduplication in-memory before hitting the DB.

### 3.3 `ensureDefaultBin` — 4 find-or-create in series

**File:** [`inventory.ts#L58-L72`](file:///d:/Code/verity/src/server/actions/inventory.ts#L58-L72)

Called during stock entry creation. 4 sequential queries (zone → rack → shelf → bin) every time a stock transaction is recorded, even for the common case where all four already exist.

---

## 4. Bundle / Client Performance

### 4.1 `production/client.tsx` — 1837 lines, ~96 KB

**File:** [`client.tsx`](file:///d:/Code/verity/src/app/owner/production/client.tsx)

The entire production studio (order form, running-orders table, batch mode, inspection cards, order studio, confirmation modal) lives in a single client component with no dynamic imports. Every user of the production page downloads the full 1837-line component before any interactivity. The order creation modal (`isStudioOpen`) in particular is only shown on demand but is always bundled and parsed.

### 4.2 `MasterSheetView.tsx` — 82 KB

**File:** [`MasterSheetView.tsx`](file:///d:/Code/verity/src/app/owner/settings/MasterSheetView.tsx)

Not code-split from the settings page — loaded synchronously on any settings visit even if the user only opens the "Team" tab.

### 4.3 Dual animation libraries loaded globally

**`package.json`** lists both `framer-motion@^12.42.2` and `gsap@^3.15.0`. Framer-motion's minified bundle is ~70 KB; GSAP is ~50 KB. Both are imported globally. GSAP is used only on the login page splash screen (5 lines of animation). Framer-motion is used for `AnimatePresence` across several pages.

### 4.4 Three Google Fonts loaded in root layout

**File:** [`layout.tsx#L6-L20`](file:///d:/Code/verity/src/app/layout.tsx#L6-L20)

```ts
const geist = Geist(...)                    // primary font
const geistMono = Geist_Mono(...)           // mono font (used in PIN input)
const notoSansDevanagari = Noto_Sans_Devanagari({ weight: ["400","500","600","700"] })
```

`notoSansDevanagari` loads four weights globally on every page including login, worker, and inspector flows — even when no Devanagari content is rendered.

Additionally, `@fontsource/inter` and `@fontsource/noto-sans-devanagari` are in `dependencies` (not dev), suggesting these self-hosted fonts may duplicate the Google Fonts load.

### 4.5 `<img>` tags instead of Next.js `<Image>` on login

**File:** [`client.tsx#L159-L161`](file:///d:/Code/verity/src/app/client.tsx#L159-L161)

```tsx
<img src="/brand/logo-dark.png" className="h-6 w-auto dark:hidden" alt="Verity Logo" />
<img src="/brand/logo-light.png" className="h-6 w-auto hidden dark:block" alt="Verity Logo" />
```

Plain `<img>` bypasses Next.js image optimisation (WebP conversion, lazy-loading, size negotiation). The `apple-icon.png` in the app directory is 268 KB — this is enormous for an app icon.

---

## 5. Auth / Session Overhead

### 5.1 JWT decryption on every server action

**File:** [`auth.ts#L25-L34`](file:///d:/Code/verity/src/lib/server/auth.ts#L25-L34)

```ts
export async function decrypt(session: string | undefined = "") {
  const { payload } = await jwtVerify(session, encodedKey, { algorithms: ["HS256"] });
  return payload;
}
```

`jose.jwtVerify` is an async crypto operation called on every `getUserSession()` → every `getOwnerUser()` → every server action. `React.cache()` deduplicates this within a single RSC render, but it fires independently per server action call in a client component (`startTransition`).

### 5.2 Login writes two audit log rows unconditionally

**File:** [`auth.ts#L29-L40`](file:///d:/Code/verity/src/server/actions/auth.ts#L29-L40) and [`auth.ts#L73-L82`](file:///d:/Code/verity/src/server/actions/auth.ts#L73-L82)

Failed login attempt → writes `auditLog`. Successful login → writes `auditLog` + `user.update` (lastLoginAt). That's 2–3 DB writes in the critical authentication path before the redirect fires. Not a correctness problem, but adds 20–60 ms to login time.

---

## 6. Live Update Architecture Concerns

### 6.1 In-process EventEmitter — breaks on multi-instance deployments

**File:** [`live-bus.ts#L14`](file:///d:/Code/verity/src/lib/server/live-bus.ts#L14)

> *"On a multi-instance serverless platform (e.g. Vercel with several lambdas) a publish on instance A won't reach a listener on instance B."*

The code acknowledges this. If deployed to Vercel (likely, given `.vercel` directory in repo), live updates are not reliable. Workers completing jobs on one lambda will not refresh the owner's browser connected to a different lambda.

### 6.2 `router.refresh()` on SSE is a full page re-fetch

The SSE → `router.refresh()` path does not do granular updates. It re-renders **every server component** in the current route, including `getOwnerUser()`, `getMasterData()`, `getRunningOrders()`, and all their downstream queries. A factory with 10 workers completing stages simultaneously would trigger 10 full-page re-fetches on the owner's production screen within a few seconds.

---

## 7. Prisma Client Configuration

**File:** [`prisma.ts`](file:///d:/Code/verity/src/lib/prisma.ts)

```ts
const prismaClientSingleton = () => {
  return new PrismaClient()   // no logging, no query timeout, no connection pool config
}
```

No query logging in development (makes slow queries invisible during development), no `log: ['query']` for perf tracing, no `datasourceUrl` connection pool tuning for the serverless environment (Supabase Postgres over the internet benefits from `?pgbouncer=true&connection_limit=1`).

---

## Ranked Issue List

| Priority | Issue | Location | Est. Impact |
|----------|-------|----------|-------------|
| 🔴 P0 | `getMasterData()` 14 sequential queries (no `Promise.all`) | `orders.ts:88` | 200–400 ms per load |
| 🔴 P0 | Double `router.refresh()` on every save (client + SSE) | `LiveRefresh.tsx`, every client component | Full-page re-render flash on every save |
| 🔴 P0 | `revalidateMasterPaths()` busts 3 unrelated page caches on every catalog edit | `masterData.ts:10` | Every CRUD triggers expensive page re-fetch |
| 🟠 P1 | `salesOrderInclude` 6-level deep include used everywhere | `jobCardAdapter.ts:80` | Over-fetching on every order query |
| 🟠 P1 | `bulkImportVehicles` N+1 loop (5 queries/row, no batching) | `masterData.ts:334` | Import timeout on large files |
| 🟠 P1 | `productVariant` query fetches all BOM data on Settings load | `settings/page.tsx:21` | Potentially MBs of unused nested data |
| 🟡 P2 | `ensureDefaultBin` 4 sequential find-or-creates per stock transaction | `inventory.ts:58` | 40–80 ms added to every stock entry |
| 🟡 P2 | `LiveRefresh` 3-second settle timer applies refresh during "non-busy" states | `LiveRefresh.tsx:60` | Unexpected mid-task refreshes |
| 🟡 P2 | `production/client.tsx` 1837 lines not code-split | `production/client.tsx` | Large initial parse cost |
| 🟡 P2 | `MasterSheetView.tsx` 82 KB not lazy-loaded | `settings/MasterSheetView.tsx` | Loaded on every settings visit |
| 🟢 P3 | GSAP loaded globally (only used in login splash) | `client.tsx:10` | ~50 KB unused on all non-login pages |
| 🟢 P3 | Noto Sans Devanagari 4 weights loaded globally | `layout.tsx:16` | Extra font bytes on every page |
| 🟢 P3 | `<img>` instead of `<Image>` for logos | `client.tsx:159` | No WebP/lazy-load on critical first paint |
| 🟢 P3 | Prisma client has no query logging or timeout config | `prisma.ts` | Slow queries invisible during development |
| 🟢 P3 | In-process EventEmitter breaks on multi-instance deploy | `live-bus.ts` | Live updates unreliable on Vercel |
| 🟢 P3 | Login writes 2–3 audit rows in auth critical path | `auth.ts:73` | Minor latency on login |

---

## Key Files Referenced

| File | Issue |
|------|-------|
| [`orders.ts`](file:///d:/Code/verity/src/server/actions/orders.ts) | `getMasterData()` sequential queries, `getRunningOrders()` deep include |
| [`masterData.ts`](file:///d:/Code/verity/src/server/actions/masterData.ts) | `revalidateMasterPaths()` over-broad, `bulkImportVehicles` N+1, `importMasterCsv` N+1 |
| [`jobCardAdapter.ts`](file:///d:/Code/verity/src/lib/server/jobCardAdapter.ts) | `salesOrderInclude` 6-level deep include object |
| [`production/page.tsx`](file:///d:/Code/verity/src/app/owner/production/page.tsx) | 4 heavy queries at page load |
| [`production/client.tsx`](file:///d:/Code/verity/src/app/owner/production/client.tsx) | 1837-line monolithic client component |
| [`settings/page.tsx`](file:///d:/Code/verity/src/app/owner/settings/page.tsx) | 15 queries, productVariant with 5-level include |
| [`dashboard/page.tsx`](file:///d:/Code/verity/src/app/owner/dashboard/page.tsx) | Nested `.then()` waterfall inside `Promise.all` |
| [`LiveRefresh.tsx`](file:///d:/Code/verity/src/components/providers/LiveRefresh.tsx) | SSE → `router.refresh()` on every factory event |
| [`AutoRefresh.tsx`](file:///d:/Code/verity/src/components/providers/AutoRefresh.tsx) | Focus-based refresh (correctly implemented, no issue) |
| [`inventory.ts`](file:///d:/Code/verity/src/server/actions/inventory.ts) | `ensureDefaultBin` 4-query find-or-create chain |
| [`stages.ts`](file:///d:/Code/verity/src/server/actions/stages.ts) | `revalidateStagePaths` + `publishChange` both fire on every worker action |
| [`prisma.ts`](file:///d:/Code/verity/src/lib/prisma.ts) | No logging, no timeout, no pool config |
| [`owner.ts`](file:///d:/Code/verity/src/lib/server/owner.ts) | `getOwnerUser` fetches full factory row on every call |
| [`layout.tsx`](file:///d:/Code/verity/src/app/layout.tsx) | 3 global fonts incl. Noto Sans Devanagari 4 weights |
| [`client.tsx (root)`](file:///d:/Code/verity/src/app/client.tsx) | GSAP imported globally, `<img>` for logos |
