# Verity PRDs

[`ARCHITECTURE.md`](../ARCHITECTURE.md) is the engineering law. These PRDs describe specific deltas — what to build next, in what order, and how you will know it worked.

**One rule:** a PRD describes a delta from the code that exists today, not a greenfield system. A PRD that ignores what's already built produces a rewrite estimate instead of a plan. Read the architecture doc first, then come here.

## The documents

| # | Document | Phase | Blocks |
|---|---|---|---|
| [00](./00-module-system.md) | Module system — manifest, installer, ownership | A | Everything below |
| [01](./01-metering-and-billing.md) | Metering & subscription billing | A | Charging for anything |
| [02](./02-ai-assistant.md) | AI assistant (Groq) | A | The implementation-cost wedge |
| [03](./03-module-contract.md) | Module contract & developer platform | **DEFERRED ~Nov 2026** | External developers — do not touch until PRD 02 + 04 are shipped |
| [04](./04-franchise-modules.md) | Kitchen Ops, Field Compliance, Franchise Ops | B | Franchise pack completeness |
| [05](./05-master-data-refinements.md) | Master Data edit & delete options | A | UI/UX and database consistency |
| [06](./06-veda-backports.md) | Veda platform backports & optimizations | B | Alignment with Veda updates |

Read 00 first. The other documents assume the manifest exists.

## Architecture — what's built vs what's aspirational

The full picture is in [`ARCHITECTURE.md §Current state vs the end state`](../ARCHITECTURE.md). Short version for PRD context:

| Claim | Reality |
|---|---|
| Modules are independently installable units | ✅ `ModuleEntitlement` gates per tenant; `guardModuleWrite` enforces on every mutating action. |
| Each module owns its permissions and nav items | ✅ Permissions declared in registry; nav resolved by `navigation.ts` — never hardcoded in shell. |
| Each module owns its DB tables | ⚠️ Convention only. Tables live in one `schema.prisma`; folder isolation (`src/modules/<key>/`) deferred to Nov 2026. |
| Modules declare versioned contracts | ✅ `version: "1.0.0"` on all 22 modules; bumping on breaking change is the rule. |
| Vertical packs compose modules without duplicating logic | ✅ Packs are lists of module keys + a price. Zero business logic in pack files. |
| Pay only for active modules, per month | ✅ Pricing enforced by test; subscription lifecycle cron live; invoices append-only. |
| AI assistant configures 80% on first setup | ❌ Not built. See [PRD 02](./02-ai-assistant.md). |
| Event bus for cross-module communication | ❌ Not built. `Notification` model is the interim. |
| Configurable workflow engine | ❌ Not built. State machines are per-module today. |
| Dashboard widget registry | ❌ Not built. Per-pack dashboards today. |

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
