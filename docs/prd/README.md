# Verity PRDs

The architecture document says what Verity should become. These say what to
build, in what order, and how you will know it worked.

One rule for everything here: **a PRD describes a delta from the code that
exists today, not a greenfield system.** Verity already has multi-tenancy, a
module registry, entitlements, four vertical packs and 408 tests. A PRD that
ignores that produces a rewrite estimate instead of a plan.

## The documents

| # | Document | Phase | Blocks |
|---|---|---|---|
| [00](./00-module-system.md) | Module system — manifest, installer, ownership | A | Everything below |
| [01](./01-metering-and-billing.md) | Metering & subscription billing | A | Charging for anything |
| [02](./02-ai-assistant.md) | AI assistant (Groq) | A | The implementation-cost wedge |
| [03](./03-module-contract.md) | Module contract & developer platform | D | External developers |
| [04](./04-franchise-modules.md) | Kitchen Ops, Field Compliance, Franchise Ops | B | Franchise pack completeness |
| [05](./05-master-data-refinements.md) | Master Data edit & delete options | A | UI/UX and database consistency |

Read 00 first. The other documents assume the manifest exists.

## Status of the architecture's claims

The architecture makes six promises. Three are substantially true today, three
are not yet built. Stating which is which is the point of this table — the
roadmap's Phase A is short because most of the substrate is already there.

| Claim | Reality |
|---|---|
| "Modules are independently installable units" | **Partly.** `ModuleEntitlement` already turns modules on and off per tenant, and `guardModuleAction` / `guardModulePage` enforce it. But a module is an entry in one registry file, not a folder that owns anything. See [00](./00-module-system.md). |
| "Each module owns its DB tables, permissions, nav items" | **Permissions yes, the rest no.** Permissions are declared per module in the registry. DB tables live in one 2,500-line `schema.prisma`. Nav items are a hardcoded array in `owner-shell.tsx` that *filters* on `requiredModule` — module-aware, but not module-owned. |
| "Modules declare versioned contracts; core never breaks them" | **Not built.** `ModuleDefinition` has no `version` field. Nothing to break yet, which makes now the cheap time to add it. |
| "Pay only for active modules, per month" | **Priced, not yet billed.** `pricing.ts` and `TenantSubscription` exist, with the pack discount under test. Still missing: charge lines, invoice generation, and the read-only enforcement a lapsed trial needs. See [01](./01-metering-and-billing.md). |
| "Vertical packs compose a tailored UI from the same modules" | **True.** Four packs, each resolving to a dashboard through `resolvePackKey`, guarded by a test that fails if a pack has no dashboard case. |
| "AI assistant configures 80% on first setup" | **Not built.** No Groq integration, no assistant surface. See [02](./02-ai-assistant.md). |

## Commercial ground truth — settled

Three decisions are locked and implemented. They apply across all six PRDs.
Prices live in `src/platform/pricing.ts`; `src/platform/pricing.test.ts`
recomputes every pack discount from the pack definitions on each run, so the
price list cannot drift from the claim the way it did before.

**Module prices — one number per tier, not a band.** Platform ₹2,500 · Tier 1
₹2,500 · Tier 2 ₹4,500 · Tier 3 ₹7,000. Platform plus one Tier 1 module is
exactly ₹5,000/month, which is the "no client too small" entry price, asserted
by test.

**Packs are 20–25% cheaper than their parts**, enforced rather than asserted.

| Pack | À la carte | Pack | Discount |
|---|---|---|---|
| Auto Components OS | ₹32,500 | ₹24,999 | 23.1% |
| Facility Management OS | ₹32,500 | ₹25,499 | 21.5% |
| Franchise QSR OS | ₹26,000 | ₹19,999 | 23.1% |
| Franchise Retail OS | ₹28,000 | ₹21,999 | 21.4% |

That gap is the upsell — a client who came for Inventory can see the whole
vertical costs less than assembling it.

**Team size is three flat brackets, not per-seat.** Small (≤10) included ·
Medium (11–50) +₹3,000 · Large (51+) +₹8,000. A factory with eighty floor
workers is one flat Large; nobody audits a headcount to bill.

**Trial is 7 days, no card.** Day 5 the assistant nudges, day 8 the workspace
goes read-only, 30 days of retention from that point before a deletion warning.
`SubscriptionStatus` carries `TRIAL_EXPIRED` and `READ_ONLY` as distinct states —
same access, different story, different recovery path.

### Still open

1. **No free tier.** Odoo's "One App Free" is its acquisition funnel, and the
   architecture treats it as a trap rather than as competition. The 7-day trial
   is now the self-serve door, which may be sufficient — but a trial expires and
   a free tier does not, and only one of those keeps a dormant prospect
   reachable.
2. **Which pack does a new tenant get by default?** An unrecognised `industry`
   falls back to the auto-components dashboard. Right for the current client
   mix, wrong once retail outnumbers factories.
3. **Franchise pack prices will need raising.** PRD 04 adds three Tier 3 modules
   to the franchise packs, taking QSR's à la carte total from ₹26,000 to
   ₹40,000. The pack price has to move with it. `pricing.test.ts` will fail when
   those modules land, which is the intended reminder.
