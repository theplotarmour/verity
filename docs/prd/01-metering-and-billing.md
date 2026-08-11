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

## Pricing problems to resolve before building

The architecture's pricing section is internally inconsistent. These are not
implementation details — they change the schema — so they are here rather than
buried.

### The packs are not cheaper than à la carte

Taking the published tier bands (Tier 1 ₹1,500–3,000, Tier 2 ₹2,000–5,000,
Tier 3 ₹3,000–8,000, platform ₹3,000) and pricing each module at the **midpoint**
of its band:

| Pack | À la carte at midpoint | Pack price | Actual discount |
|---|---|---|---|
| Auto Components OS | ₹24,750 | ₹24,999 | **−1%** (pack costs more) |
| Facility Management OS | ₹20,250 | ₹22,999 | **−14%** (pack costs more) |
| Franchise QSR OS | ₹25,500 | ₹28,999 | **−14%** (pack costs more) |
| Franchise Retail OS | ₹25,500 | ₹26,999 | **−6%** (pack costs more) |

<details>
<summary>Working, so the numbers can be checked rather than trusted</summary>

Midpoints: Tier 1 ₹2,250 · Tier 2 ₹3,500 · Tier 3 ₹5,500 · platform ₹3,000.
Core is ₹0 (bundled into the platform fee).

- **Auto Components** = platform 3,000 + Inventory 2,250 + Manufacturing 3,500 +
  Quality 3,500 + Procurement 3,500 + Sales 3,500 + Automotive 5,500 = **24,750**
- **Facility Management** = 3,000 + People 2,250 + Sites 3,500 + Scheduling 3,500 +
  Helpdesk 2,250 + Assets 3,500 + Billing 2,250 = **20,250**
- **Franchise QSR** = 3,000 + Inventory 2,250 + Quality 3,500 + Procurement 3,500 +
  People 2,250 + Franchise Ops 5,500 + Kitchen Ops 5,500 = **25,500**
- **Franchise Retail** = 3,000 + Inventory 2,250 + Sales 3,500 + People 2,250 +
  Sites 3,500 + Franchise Ops 5,500 + Field Compliance 5,500 = **25,500**

</details>

The advertised "25–30% discount" only appears if every module is priced at the
**top** of its band:

| Pack | À la carte at band maximum | Pack price | Discount |
|---|---|---|---|
| Auto Components OS | ₹34,000 | ₹24,999 | 26% |
| Facility Management OS | ₹27,000 | ₹22,999 | 15% |
| Franchise QSR OS | ₹35,000 | ₹28,999 | 17% |

So even at maxima only one pack hits the claim. A prospect who prices the
modules individually will find the bundle worse value in every case — and
prospects do that arithmetic.

**Decision needed.** Either publish exact per-module prices chosen so the packs
genuinely discount, or drop the "25–30%" claim and sell packs on configuration
rather than price. The schema is the same either way; the marketing is not.

### Per-user overage contradicts the thesis

The competitive section praises Frappe for charging per site and calls
per-seat "the pricing model SMBs want". The pricing section then charges
₹500/user beyond five.

At a 50-person facility-management company that is ₹22,500/month of overage on
top of a ₹22,999 pack — seats nearly double the bill and grow without limit,
which is the Odoo shape the wedge is supposed to attack. Verity is still much
cheaper than Odoo at that size (₹45,499 against roughly ₹3.2L), so the pricing
works; it is the *story* that stops working, because the objection "you charge
per seat too" becomes true.

**Decision needed.** Recommendation: keep per-user but cap it, or band it
(5 / 25 / 100 / unlimited). A cap preserves the "no client too small" entry
price without recreating per-seat economics at the top.

### No free tier

Odoo's "One App Free" is listed as a catch. It is also their funnel. Verity's
cheapest door is ₹7,500/month, which means every customer arrives through a
sales conversation.

**Decision needed.** A single-module free tier capped at, say, two users would
cost little (the module is already built) and is the only thing here that
creates self-serve acquisition. It is out of scope for this PRD but it changes
whether `TenantSubscription` needs a `plan: FREE` state, so it should be decided
before the schema lands.

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

### R1 — Subscription model

```prisma
model TenantSubscription {
  id             String   @id @default(cuid())
  organizationId String   @unique
  /// Pack key when on a bundle, null when à la carte.
  packKey        String?
  /// Base platform fee in paise, snapshotted at signup.
  platformFee    Int
  includedUsers  Int      @default(5)
  perUserFee     Int
  status         String   // TRIAL, ACTIVE, PAST_DUE, CANCELLED
  trialEndsAt    DateTime?
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
}
```

**Money is stored in paise, as integers.** Not rupees, not floats. A float
rounding error in a price is a support ticket that takes an hour to explain.

**Prices are snapshotted onto the subscription**, not read live from the
manifest. A tenant who signed at ₹1,500 for Inventory keeps paying ₹1,500 when
the list price moves to ₹2,000, until someone deliberately re-prices them. The
alternative — reading `manifest.monthlyPrice` at invoice time — silently
raises every existing customer's bill the moment a price changes, which is the
kind of thing that ends up on Twitter.

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

### R7 — Trials
`ModuleEntitlement.expiresAt` already exists and is unused. A trial is an
entitlement with an expiry and a line priced at zero. On expiry the module
deactivates and the tenant is told beforehand.

**Acceptance:** an expired trial entitlement stops passing `guardModuleAction`.

## Risks

| Risk | Mitigation |
|---|---|
| Billing drifts from entitlement | R6 reconciliation test, run in CI against seed data |
| A price change silently re-bills existing tenants | Snapshotted prices on the line, never read live |
| Float rounding in money | Integer paise everywhere; a lint rule against `Float` on money columns |
| Platform invoices leak into tenant books | Separate model from `ServiceInvoice`; a test asserts the Tally export contains no `PlatformInvoice` rows |

## Success criteria

- An operator can answer "why is this tenant's bill ₹24,999?" from one screen.
- Deactivating a module lowers the next invoice, with the line closed and dated.
- Entitlements and charge lines reconcile exactly, verified in CI.
