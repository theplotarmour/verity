# PRD 04 — Franchise Modules

**Phase B · Kitchen Ops · Field Compliance · Franchise Ops**

## Problem

The two franchise packs are sold as complete verticals. They are not. Both
dashboards read data the tenant has no dedicated tooling to produce — outlet
scores come from generic service inspections, and there is no HACCP log, no
visual-standards audit, and no HQ command centre.

## What already exists

This is the important part, because three of the architecture's five franchise
bullets are already built and re-specifying them would produce duplicate code —
the failure this codebase has already paid for three times.

| Capability | Status |
|---|---|
| Outlets as Sites | Built. Franchise packs carry `sites`; a Site is a place with a manager, a roster and checklists. |
| Daily SOP gate | Built. `internal/sopGate.ts` blocks dispatch until today's opening checklist is approved. Opt-in, per outlet, does not block data entry. |
| Photo evidence on checkpoints | Built. `requireImage` enforced on submit; rear camera on mobile. |
| One-click outlet launch | Built. Creates a Site plus optional STORE_MANAGER, PIN shown once. |
| Outlet health scorecard | Built, on the QSR dashboard — passed audits over completed audits, worst first, unaudited outlets listed but unscored. |
| Supplier price audit | Built. Median-based, ≥3 purchases, flags >15% above network median. |
| HACCP / temperature logs | **Missing.** Generic `NUMBER` checkpoints can hold a fridge temp, but nothing enforces a range, and nothing produces the log a food-safety inspector asks for. |
| Visual-standards audit by zone | **Missing.** Photos attach to a checkpoint, not to a named area of the store. |
| HQ command centre | **Missing.** The dashboard is one tenant's network; there is no cross-outlet drill-down or comparison view. |

So this PRD covers three genuine gaps, not five.

## Module: Kitchen Ops (Tier 3, QSR)

### Why it is its own module
A temperature reading with a safe range, a breach, and a corrective action is a
different object from a checklist answer. Food safety needs the reading kept
even when it passes, an alert when it does not, and an exportable log for an
inspector. Modelling that as a `value` string on a checkpoint would make the
inspector's report a text-parsing exercise.

### Requirements

**K1 — Ranged checkpoints.** A checkpoint may declare `minValue`, `maxValue`
and a unit. A reading outside the range is a fail regardless of what the user
selected, and requires a corrective-action note before submit.

Rationale: the failure mode this prevents is a manager typing 9°C into a
"fridge temp" field, ticking Pass, and the audit reading as clean. Extends the
existing `Checkpoint` rather than creating a parallel one — `MEASUREMENT`
already exists as an `inputType` and does nothing today.

**K2 — Oil quality log.** Fryer, TPM reading or visual grade, action taken,
who and when. Per outlet, with a filter-or-change threshold.

**K3 — HACCP export.** A date range per outlet producing every ranged reading
with its limit, breaches highlighted, corrective actions attached. CSV and
print. This is the artefact an inspection actually demands.

**K4 — Breach alerting.** A reading outside range writes a `Notification` to
the area manager, not only to the outlet that recorded it. An outlet reporting
its own breach to itself is not a control.

## Module: Field Compliance (Tier 3, Retail + FM)

### Why it is its own module
Visual merchandising is spatial. "The window display is wrong" needs to attach
to the window, not to audit #47 checkpoint #3. Retail and facility management
both need it, which is exactly the reuse test that says it is a module and not
a pack feature.

### Requirements

**F1 — Zones.** A site defines named zones — Entrance, Window, Till, Aisle 3,
Washroom. Reusable as a per-tenant template so a fifty-store network defines
them once.

**F2 — Zone audits.** An audit walks the zones; each takes a photo, a
pass/fail, and optional violation tags.

**F3 — Violation taxonomy.** A per-tenant tag list (`planogram`, `cleanliness`,
`signage`, `stock-gap`), so violations aggregate across the network. Free text
cannot be counted, and counting is the entire point of a network audit.

**F4 — Comparison view.** The same zone across outlets, side by side, latest
photo each. This is how a brand manager sees that eleven stores have the wrong
window — a per-store report never shows it.

**F5 — Trend.** Violations per zone over time, so "the till area is always the
problem" becomes visible.

## Module: Franchise Ops (Tier 3, QSR + Retail)

### Why it is its own module
The scorecard and price audit currently live inside two dashboard components.
That is correct for a dashboard panel and wrong as a product surface: the
scoring rules are duplicated across `QsrFranchiseDashboard` and
`RetailFranchiseDashboard` today, and duplicated logic that drifts is the single
recurring defect in this codebase's history.

### Requirements

**O1 — Extract scoring to one place.** One `outletScore(factoryId, window)`
serving both dashboards, the command centre and any export. Behaviour must be
identical to today's, including that an unaudited outlet is unscored rather
than zero — that distinction is deliberate and easy to lose in a refactor.

**Acceptance:** a characterisation test pins current dashboard output *before*
the extraction, and passes unchanged after.

**O2 — HQ command centre.** One screen: every outlet, its score, open issues,
SOP status today, last audit. Sortable, drillable. The dashboard answers "how is
the network"; this answers "which outlet, and what do I do about it".

**O3 — Composite scoring.** Compliance is one input. Add CSAT and sales when
present, with published weights and each component visible.

A composite must never hide its parts. A single "82" that blends a clean
kitchen with poor sales tells a manager nothing actionable, which is how
scorecards become wallpaper.

**O4 — Scheduled scorecard export.** Weekly network scorecard, exportable and
emailable.

**O5 — SOP library.** Seed templates per pack — QSR opening, HACCP, retail
visual standards — so a new tenant starts with checklists rather than an empty
Quality screen. Referenced by `PACKS[].seedTemplates`.

## Pack changes, and what they cost

| Pack | Add |
|---|---|
| `franchise_qsr` | `franchise_ops`, `kitchen_ops` |
| `franchise_retail` | `franchise_ops`, `field_compliance` |

Both packs already carry `sites`, `quality` and `helpdesk` — added when the
dashboards were found to be reading data the packs did not entitle. The
`pack-entitlements.test.ts` guard will fail if a new module's queries are not
covered, which is the intended way to find out.

### The pack prices must move with them

All three are Tier 3 at ₹7,000. Adding them changes the à la carte totals, and
the published pack price has to follow or the 20–25% discount band breaks:

| Pack | À la carte now | After | Pack price now | Must become |
|---|---|---|---|---|
| Franchise QSR OS | ₹26,000 | ₹40,000 | ₹19,999 | ₹30,000–₹32,000 |
| Franchise Retail OS | ₹28,000 | ₹42,000 | ₹21,999 | ₹31,500–₹33,600 |

`pricing.test.ts` fails the moment the modules are added to `packs.ts` and the
price is not updated — which is the point. It reports both the à la carte total
and the actual discount, so the correction is arithmetic rather than
archaeology.

**This is a real price rise for existing franchise tenants**, roughly ₹10,000/month.
Existing subscriptions snapshot their price (PRD 01 R1), so nobody is
auto-charged more; moving them is a deliberate commercial conversation. Worth
knowing before the modules ship rather than after.

## Risks

| Risk | Mitigation |
|---|---|
| Extracting scoring changes the numbers | O1 characterisation test written first |
| Ranged checkpoints break existing checklists | `minValue`/`maxValue` nullable; absent means today's behaviour |
| Zone audits duplicate service inspections | Zones attach to the existing `ServiceInspection`; no parallel audit table |
| Composite score hides its inputs | O3 requires components be shown alongside |
| Three modules ship half-done | Kitchen Ops first — it is the only one with a regulatory driver |

## Success criteria

- A QSR tenant produces an inspector-ready HACCP log without leaving Verity.
- A retail brand manager sees the same zone across fifty stores on one screen.
- Outlet scoring exists once, and both dashboards call it.
