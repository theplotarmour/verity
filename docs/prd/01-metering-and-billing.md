# PRD 01 — Metering & Subscription Billing

**Phase A · Depends on PRD 00 · Blocks charging anyone**

## Problem

The entire commercial thesis is "pay only for active modules". Verity cannot
currently charge for a module at all.

What exists: `Factory.setupFee` and `Factory.monthlyFee`, two integers an
operator types into the HQ console. They are a note-to-self. Nothing reads them,
nothing generates an invoice from them, and they have no relationship to which
modules a tenant actually has.

What also exists, and is easy to confuse with this: `ServiceInvoice`. That is
the *tenant's* invoice to *their* customer — a facility-management company
billing a client for a month of guarding. It is a product feature. Platform
billing is Verity billing the tenant, and it is a different table with a
different lifecycle. Reusing `ServiceInvoice` for both would put Verity's
revenue inside the tenant's own books, visible to them and included in their
Tally export.

## The price list — settled

Three commercial decisions are locked. They are implemented in
`src/platform/pricing.ts` and enforced by `src/platform/pricing.test.ts`, which
recomputes every pack discount from the pack definitions on each run.

That test exists because the previous price list was prose, and prose drifted:
it advertised a 25–30% pack discount while, at the midpoint of its own published
bands, every pack cost **more** than buying the same modules individually.
Nothing failed. The claim simply stopped being true in a table nobody
recomputed.

### 1. Module prices — one number per tier

The band was the defect. "Tier 2 costs ₹2,000–₹5,000" gives two answers to
"what does Quality cost", and the discount was computed against one while the
price list showed the other. A tier is now a taxonomy; the price is a number.

| | Price/month | Modules |
|---|---|---|
| Platform base | ₹2,500 | Core + Small team bracket |
| Tier 1 — universal | ₹2,500 each | Inventory, People, Helpdesk, Billing |
| Tier 2 — operations | ₹4,500 each | Procurement, Sales, Manufacturing, Quality, Assets, Projects, Scheduling, Sites, Reporting |
| Tier 3 — vertical | ₹7,000 each | Automotive, Franchise Ops, Kitchen Ops, Field Compliance, … |

Platform + one Tier 1 module is **exactly ₹5,000/month**, which is the "no
client too small" entry price the strategy commits to. That is a number with a
promise attached, so a test asserts it rather than trusting the arithmetic to
stay true.

### 2. Pack prices — a real 20–25% discount

The gap is deliberate. It is the upsell: a client who came for Inventory must be
able to see that the whole vertical costs less than assembling it piece by
piece.

| Pack | À la carte | Pack price | Discount |
|---|---|---|---|
| Auto Components OS | ₹32,500 | **₹24,999** | 23.1% |
| Facility Management OS | ₹32,500 | **₹25,499** | 21.5% |
| Franchise QSR OS | ₹26,000 | **₹19,999** | 23.1% |
| Franchise Retail OS | ₹28,000 | **₹21,999** | 21.4% |

These totals come from the **actual pack definitions in `packs.ts`**, not from
the architecture document's module lists — the two differ, because the franchise
packs gained `sites` and `helpdesk` when the dashboards were found to be reading
data the packs did not entitle. Pricing against the document rather than the code
was the first thing the test caught.

**Consequence to expect:** PRD 04 adds Franchise Ops, Kitchen Ops and Field
Compliance to the franchise packs. Three Tier 3 modules at ₹7,000 raise the QSR
à la carte total from ₹26,000 to ₹40,000, and the pack price must rise with it
or the discount leaves the band. The test will fail the moment those modules are
added — which is the intended way to be reminded.

### 3. Team size — three flat brackets, no per-seat

Per-user pricing is gone. It contradicted the competitive position, and at fifty
users it nearly doubled the bill — recreating exactly the per-seat economics the
product attacks.

| Bracket | Users | Add-on |
|---|---|---|
| Small | up to 10 | included |
| Medium | 11–50 | +₹3,000/mo |
| Large | 51+ | +₹8,000/mo |

A factory with eighty floor workers is one flat Large. Nobody audits a headcount
to produce an invoice, and a tenant hiring their fifty-second employee does not
get a surprise. Worked example, pinned in the test: Auto Components OS at Large
is ₹24,999 + ₹8,000 = **₹32,999/month**.

`bracketForUsers()` maps a headcount to a bracket, but it **suggests** — it does
not auto-charge. Silently promoting a tenant's bracket because they added a
seasonal worker is the surprise this model exists to remove.

### 4. Trial — 7 days, no card

Self-serve, zero friction, full access.

| Day | What happens |
|---|---|
| 0 | Workspace created, `status = TRIAL`, `trialEndsAt = +7d` |
| 5 | Assistant raises activating billing (PRD 02, R8) |
| 8 | `status = TRIAL_EXPIRED`, workspace read-only, `readOnlySince` set |
| 38 | Deletion warning — 30 days after read-only began |

The nudge is on day 5, not day 7, because a trial ending tomorrow forces a
decision under pressure, and a decision made under pressure is usually
"not now".

## Goals

1. A tenant's bill is derived from what they actually have active, not typed in.
2. An operator can see, for any tenant, exactly what they will be charged and why.
3. Deactivating a module reduces the next bill, and the change is auditable.

## Non-goals

- **Payment collection.** No gateway, no mandates, no dunning. This PRD produces
  a correct invoice; getting paid is a later problem and probably a Razorpay
  integration.
- **Usage-based metering** (per order, per API call). Module-count and user-count
  only. Usage metering needs a counter pipeline nobody needs yet.
- **Proration to the day.** See R3.

## Requirements

### R1 — Subscription model — **built**

`TenantSubscription` is in `schema.prisma` and pushed. There is no user-count
column by design; the bracket is the charge.

```prisma
enum TeamSizeBracket { SMALL MEDIUM LARGE }

enum SubscriptionStatus {
  TRIAL          // 7 days, no card, full access
  ACTIVE         // paying
  TRIAL_EXPIRED  // trial lapsed without converting → read-only
  READ_ONLY      // a paying tenant who lapsed → read-only
  CANCELLED
}

model TenantSubscription {
  organizationId  String             @unique
  status          SubscriptionStatus @default(TRIAL)
  packKey         String?
  teamSizeBracket TeamSizeBracket    @default(SMALL)
  basePrice       Int                // paise, snapshotted
  bracketPrice    Int                @default(0)
  trialEndsAt     DateTime?
  readOnlySince   DateTime?
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
}
```

**`TRIAL_EXPIRED` and `READ_ONLY` are both read-only, and are deliberately not
one state.** The access is identical; the story is not. One never paid and needs
a first-run activation flow; the other paid for months and needs a billing fix
and an apology. Collapsing them loses the only information that decides which
message to send.

**`readOnlySince` counts retention, not `trialEndsAt`.** A tenant who paid for
six months and then lapsed gets the same 30 days as one who never paid, counted
from when they actually lost write access — otherwise a long-standing customer's
data clock starts at a trial that ended a year ago.

**Money is paise, as integers.** Not rupees, not floats. A rounding error in a
price is a support conversation nobody can win.

**Prices are snapshotted onto the subscription**, not read live. A tenant who
signed at ₹19,999 keeps paying it when the list moves, until someone
deliberately re-prices them. Reading the live price at invoice time silently
raises every existing customer's bill the moment marketing edits a number.

### R2 — Charge lines

```prisma
model SubscriptionLine {
  id             String   @id @default(cuid())
  subscriptionId String
  /// Module key, or "platform" / "users" for the base and seat lines.
  itemKey        String
  label          String
  unitPrice      Int      // paise, snapshotted
  quantity       Int      @default(1)
  activeFrom     DateTime
  activeTo       DateTime?  // null = still active
}
```

Lines are append-only with a validity window. Deactivating a module closes its
line; it does not delete it. Last month's invoice must still be explainable in
six months, and that is impossible if the line it was built from is gone.

### R3 — Invoice generation

A monthly job builds a `PlatformInvoice` per active subscription from the lines
that overlapped the period.

**Proration is monthly, not daily.** A module active for any part of a month is
charged for that month. This is a deliberate simplification: daily proration
turns every invoice into an arithmetic argument, and at ₹1,500/module the
disputed amount is smaller than the cost of the conversation. It must be stated
on the invoice.

**Acceptance:** a test activates a module mid-period and asserts the invoice
charges a full month with the activation date shown on the line.

### R4 — Operator visibility
The HQ client detail page shows the tenant's current subscription, every active
line with its price, the projected next invoice, and invoice history.

**Acceptance:** the projected total equals the sum of active lines; a test
asserts this rather than a human checking.

### R5 — Tenant visibility
`/owner/settings/billing` shows the same figures to the tenant, plus what each
module costs them. A tenant who cannot see why their bill went up will ask, and
that question is more expensive than the screen.

### R6 — Entitlement is the source of truth
Nothing may charge for a module that is not entitled, and nothing may entitle a
module without a line. Both are enforced.

**Acceptance:** a reconciliation test asserts, for every tenant, that the set of
active `ModuleEntitlement` rows equals the set of open `SubscriptionLine` module
rows. This is the check that catches drift, and drift here is either lost
revenue or an overcharge.

### R7 — Trial lifecycle

A scheduled job — the same cron shape as the webhook drain — moves subscriptions
through the states:

| Transition | Trigger | Effect |
|---|---|---|
| `TRIAL` → nudge | day 5 | Assistant raises billing (PRD 02 R8). Status unchanged. |
| `TRIAL` → `TRIAL_EXPIRED` | `trialEndsAt` passed | `readOnlySince = now`. Workspace read-only. |
| `ACTIVE` → `READ_ONLY` | payment lapsed | `readOnlySince = now`. |
| any → `ACTIVE` | billing activated | `readOnlySince = null`. Full access returns. |
| read-only → deletion warning | `readOnlySince` + 30d | Notify. **Nothing is deleted by this job.** |

**Read-only means read-only, enforced server-side.** Hiding the buttons is not
enforcement — a `"use server"` export is a public POST endpoint, which is the
lesson `storage.ts` already taught this codebase. The write guard belongs beside
`guardModuleAction`, so every action inherits it rather than each remembering.

**Acceptance:**
- a subscription past `trialEndsAt` refuses a write action and permits a read;
- reactivating clears `readOnlySince` and restores writes in the same request;
- the deletion-warning transition sends a notification and deletes nothing —
  asserted by a row count before and after.

**Data is never deleted by a scheduled job.** The warning is automatic;
the deletion is a human with a reason. A cron that drops a tenant's workspace is
one bad date comparison away from dropping a paying one.

## Risks

| Risk | Mitigation |
|---|---|
| Billing drifts from entitlement | R6 reconciliation test, run in CI against seed data |
| A price change silently re-bills existing tenants | Snapshotted prices on the line, never read live |
| Float rounding in money | Integer paise everywhere; `pricing.test.ts` asserts every published amount is a whole number of paise |
| Platform invoices leak into tenant books | Separate model from `ServiceInvoice`; a test asserts the Tally export contains no `PlatformInvoice` rows |
| A pack quietly stops being a discount | `pricing.test.ts` recomputes every pack from `packs.ts` and fails outside the 20–25% band — verified by pushing a pack price out of band and watching it fail with both numbers |
| Bracket auto-promotion surprises a tenant | `bracketForUsers()` suggests; only a human changes the charged bracket |
| Read-only enforced in the UI only | Server-side write guard beside `guardModuleAction`; hiding buttons is not enforcement |
| A cron deletes a paying tenant's data | Scheduled jobs warn; they never delete |

## Success criteria

- An operator can answer "why is this tenant's bill ₹32,999?" from one screen —
  and the answer is "₹24,999 pack, ₹8,000 Large bracket", not a headcount.
- Deactivating a module lowers the next invoice, with the line closed and dated.
- Entitlements and charge lines reconcile exactly, verified in CI.
- Every pack is visibly cheaper than its parts, verified on every test run
  rather than the day the price list was written.
- A trial converts, lapses, and recovers without anyone touching the database.
