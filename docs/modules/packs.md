# Verity Vertical Packs

A pack answers "what kind of business are you?" so onboarding asks one question instead of twenty.

> **A pack is configuration, not code.** It is a list of module keys and a price. It contains zero business logic. If you find yourself writing business logic inside a pack file, it belongs in a module instead. See [`docs/ARCHITECTURE.md §8`](../ARCHITECTURE.md).

Each pack maps to a curated module bundle and a dedicated dashboard. Adding a fifth pack should follow a named customer — not precede one.

**Source of truth:** [`src/platform/tenancy/packs.ts`](../../src/platform/tenancy/packs.ts)

---

## How packs work

1. At onboarding, the tenant selects their vertical.
2. The pack's module list (expanded via `withDependencies()`) is activated.
3. `resolvePackKey()` maps the stored `Factory.industry` string → pack key → dashboard component.
4. Pricing: `PACK_PRICE[packKey]` — always 20–25% below à la carte. Enforced by `pricing.test.ts`.

---

## Pack 1 — Auto Components OS

**Pack key:** `auto_components`  
**Price:** ₹24,999/month (à la carte ₹32,500 — 23.1% off)  
**Prospect archetype:** Auto parts manufacturer, garments factory, furniture maker, any discrete-goods manufacturer.

### Modules included

| Module | Tier | Purpose |
|---|---|---|
| `core` | Platform | Shell, team, settings |
| `hr` | T1 | Workforce, attendance |
| `inventory` | T1 | Items, stock, warehouse |
| `manufacturing` | T2 | Production orders, job cards, floor board |
| `quality` | T2 | Audit checklists, QC holds |
| `procurement` | T2 | POs, GRNs, supplier management |
| `sales` | T2 | Sales orders, quotations |
| `automotive` | T3 | Vehicle catalogue, product fitment |

### What a user sees
- **Dashboard:** Auto Components dashboard — production queue, open POs, stock alerts, stage strip.
- **Key workflows:** Release a production plan → assign job cards → QC inspection → dispatch.
- **Automotive module:** Only this pack carries it. Lets a parts manufacturer tag every item to vehicle fitment (brand → model → year → variant), so a customer asking "does this gasket fit a 2019 Fortuner?" gets an answer from the catalogue.

### What it does NOT include
- No helpdesk/tickets — parts manufacturers don't typically run a support queue.
- No sites/scheduling — built for a single factory, not a distributed network.

---

## Pack 2 — Facility Management OS

**Pack key:** `facility_management`  
**Price:** ₹25,499/month (à la carte ₹32,500 — 21.5% off)  
**Prospect archetype:** Security firm, housekeeping company, AMC provider, IT MSP, facility manager — any business that deploys people to client sites.

### Modules included

| Module | Tier | Purpose |
|---|---|---|
| `core` | Platform | Shell, team, settings |
| `hr` | T1 | Workforce, attendance |
| `helpdesk` | T1 | Tickets, SLAs, service work orders |
| `billing` | T1 | Client invoicing, payroll inputs |
| `sites` | T2 | Named client sites with managers and rosters |
| `scheduling` | T2 | Shift calendar, swap requests |
| `quality` | T2 | Audit checklists, site inspections |
| `procurement` | T2 | Consumables purchasing |
| `assets` | T2 | Asset register, maintenance schedules |

### What a user sees
- **Dashboard:** Facility Management dashboard — site coverage, open tickets, SLA breaches, attendance summary.
- **Key workflows:** Assign staff to sites → track attendance → respond to tickets → invoice the client monthly.
- **Sites module:** Each client location is a Site. Managers, rostered shifts, and checklists live on the Site.
- **Retired aliases:** `security_services`, `staffing_manpower`, `housekeeping_cleaning`, `maintenance_amc`, `logistics_fleet`, `it_services_msp`, `engineering_services` all resolve to this pack.

### What it does NOT include
- No manufacturing/production — this is a service deployment business, not a factory.
- No sales module — assumes clients are managed relationships, not pipeline deals.

---

## Pack 3 — Franchise QSR OS

**Pack key:** `franchise_qsr`  
**Price:** ₹19,999/month (à la carte ₹26,000 — 23.1% off)  
**Prospect archetype:** QSR chain, café network, cloud kitchen franchise — any food business with multiple owned/franchised outlets.

> ⚠️ **Pack price will rise** when `kitchen_ops` and `franchise_ops` (PRD 04) ship. Current à la carte total moves to ₹40,000; pack price must move to ₹30,000–₹32,000. `pricing.test.ts` fails at that point — that's the intended reminder.

### Modules included (current)

| Module | Tier | Purpose |
|---|---|---|
| `core` | Platform | Shell, team, settings |
| `hr` | T1 | Workforce, attendance |
| `inventory` | T1 | Ingredients, stock |
| `helpdesk` | T1 | Open issues across the network |
| `billing` | T1 | Outlet invoicing |
| `quality` | T2 | Daily SOP gate, audit checklists |
| `procurement` | T2 | Supplier POs |
| `sites` | T2 | Each outlet is a Site — manager, roster, checklist |

### Modules planned (PRD 04)

| Module | Tier | What it adds |
|---|---|---|
| `kitchen_ops` | T3 | Ranged checkpoints, HACCP log, oil quality, breach alerts |
| `franchise_ops` | T3 | Unified outlet scoring, HQ command centre, composite scores, SOP templates |

### What a user sees
- **Dashboard:** QSR Franchise dashboard — outlet health scores (worst-first), open issues, SOP status per outlet, supplier price anomalies.
- **Key workflows:** Daily SOP gate at outlet open → photo evidence on checklists → QC inspection → outlet health score feeds HQ dashboard.
- **Sites module:** An outlet *is* a Site. Without `sites`, the outlet list renders with broken links.

### Kent's Restaurant context
Kent's is a single-location restaurant — not a franchise. The pack is oversized for them. The right fit is à la carte:
- `core` + `hr` + `inventory` + `quality` + `billing` (Tier 1 modules, ₹12,500/month base)
- Add `kitchen_ops` when it ships for the HACCP requirement
- Menu management and table/order management need UI work in `core` before they're restaurant-grade

---

## Pack 4 — Franchise Retail OS

**Pack key:** `franchise_retail`  
**Price:** ₹21,999/month (à la carte ₹28,000 — 21.4% off)  
**Prospect archetype:** Retail chain, branded apparel network, any multi-store retail brand.

> ⚠️ **Pack price will rise** when `field_compliance` and `franchise_ops` (PRD 04) ship. Same dynamic as QSR. `pricing.test.ts` fires.

### Modules included (current)

| Module | Tier | Purpose |
|---|---|---|
| `core` | Platform | Shell, team, settings |
| `hr` | T1 | Workforce, attendance |
| `inventory` | T1 | Stock, replenishment |
| `billing` | T1 | Store invoicing |
| `sales` | T2 | Sales orders |
| `quality` | T2 | Visual standards audits |
| `procurement` | T2 | Supplier POs |
| `sites` | T2 | Each store is a Site |

### Modules planned (PRD 04)

| Module | Tier | What it adds |
|---|---|---|
| `field_compliance` | T3 | Named zones, zone audits with photos, violation taxonomy, cross-store comparison |
| `franchise_ops` | T3 | Unified outlet scoring, HQ command centre, composite scores, SOP templates |

### What a user sees
- **Dashboard:** Retail Franchise dashboard — store compliance scores, supplier price audit, stock alerts.
- **Key workflows:** Visual audit per store zone → aggregate violations across the network → brand manager sees comparison view.

---

## Adding a new pack

1. Add the entry to `VERTICAL_PACKS` in [`packs.ts`](../../src/platform/tenancy/packs.ts).
2. Add the pack price to `PACK_PRICE` in [`pricing.ts`](../../src/platform/pricing.ts).
3. Run `pricing.test.ts` — it will confirm the discount lands in the 20–25% band.
4. Add a dashboard component and a case in the pack resolver.
5. Update the `pack-entitlements.test.ts` guard so the new pack's dashboard queries are covered by its module list.

**Rule:** A pack follows a customer. Don't add one speculatively.

---

## À la carte (no pack)

Tenants can activate any module individually. Common à la carte stacks:

| Business type | Suggested modules |
|---|---|
| Single restaurant | `core`, `hr`, `inventory`, `quality`, `billing` |
| Manufacturer (no auto) | `core`, `hr`, `inventory`, `manufacturing`, `quality`, `procurement`, `sales` |
| Service firm (small) | `core`, `hr`, `helpdesk`, `billing` |
| Startup (SaaS) | `core`, `crm`, `sales`, `projects` |

À la carte pricing: `PLATFORM_FEE` + sum of `modulePrice()` for each active module + team bracket surcharge.
