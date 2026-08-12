# Verity Module Reference

Verity is built from composable modules. A tenant activates the modules they need; a pack is a curated bundle of modules for a specific type of business.

**Quick orientation:**
- All modules live in [`src/platform/modules/registry.ts`](../../src/platform/modules/registry.ts)
- Pricing lives in [`src/platform/pricing.ts`](../../src/platform/pricing.ts)
- Pack definitions live in [`src/platform/tenancy/packs.ts`](../../src/platform/tenancy/packs.ts)
- Install/uninstall logic is in [`src/server/actions/modules.ts`](../../src/server/actions/modules.ts)

---

## Pricing tiers

| Tier | Price/month | What it covers |
|---|---|---|
| Platform | ₹2,500 | Core module — always on, every tenant |
| Tier 1 | ₹2,500 | Universal basics every business needs |
| Tier 2 | ₹4,500 | Operations — adds process depth |
| Tier 3 | ₹7,000 | Vertical-specific — industry differentiation |

**Team size surcharge** (flat, not per-seat):
- Small (≤10): included
- Medium (11–50): +₹3,000/month
- Large (51+): +₹8,000/month

---

## Modules

### Platform (always on, no extra charge)

#### `core`
**Always on.** Every tenant has it.

Dashboard, reports, master data, customer records, team management, role assignment, settings. The shell that every other module plugs into.

**Key permissions:** `dashboard.view`, `settings.access`, `master_data.access`, `team.manage`, `reports.view`

---

### Tier 1 — ₹2,500/month each

#### `inventory`
Stock tracking across warehouses. Items, categories, BOMs, spec sheets, bin locations, stock transfers, adjustments, ledger.

**Requires:** `core`  
**Key permissions:** `item.view`, `item.manage`, `stock.view`, `stock.adjust`, `stock.transfer`, `warehouse.manage`  
**Nav:** Inventory

---

#### `hr`
Employee profiles, attendance, shifts, leave management.

**Requires:** `core`  
**Key permissions:** `employee.view`, `employee.manage`, `attendance.record`, `leave.approve`  
**Nav:** none (data surfaces through scheduling and billing)

---

#### `helpdesk`
Tickets, SLA tracking, support queues, service work orders dispatched from tickets.

**Requires:** `core`  
**Key permissions:** `ticket.view`, `ticket.manage`, `service_wo.view`, `service_wo.manage`  
**Nav:** Helpdesk, Work Orders

---

#### `billing`
Client invoices and payroll input summaries (from attendance + timesheets).

**Requires:** `core`, `sales`  
**Key permissions:** `invoice.view`, `invoice.manage`, `payroll.view`, `payroll.export`  
**Nav:** Billing

> Note: `billing` here is the *service business* billing module (invoice a client for a month of security guards). The platform's own subscription billing — what Verity charges the tenant — is separate, in `src/server/actions/subscription.ts`.

---

### Tier 2 — ₹4,500/month each

#### `manufacturing`
Production orders, job cards, stage routing, work-in-progress tracking, rework/scrap.

**Requires:** `core`, `inventory`  
**Key permissions:** `production.view`, `production.manage`, `production.release`  
**Nav:** Production, Floor Board, Job Cards, Logistics

---

#### `quality`
Audit checklists, inspection workflows, pass/fail scoring, photo evidence, QC holds, breach notifications.

**Requires:** `core`  
**Key permissions:** `audit.view`, `audit.conduct`, `audit.approve`  
**Nav:** Quality

---

#### `procurement`
Purchase orders, supplier management, goods receipts, price history.

**Requires:** `core`, `inventory`  
**Key permissions:** `po.view`, `po.manage`, `po.approve`, `grn.manage`  
**Nav:** Procurement

---

#### `sales`
Sales orders, quotations, customer pipeline.

**Requires:** `core`  
**Key permissions:** `so.view`, `so.manage`, `so.approve`  
**Nav:** Sales

---

#### `crm`
Leads, deals, pipeline stages, customer activity history. The pre-sales layer that feeds into `sales`.

**Requires:** `core`, `sales`  
**Key permissions:** `deal.view`, `deal.manage`, `deal.close`  
**Nav:** none yet (pipeline lives inside the sales surface)

> **Kent's context:** CRM covers "customer management" in a restaurant context — walk-in customers, repeat visitors, loyalty tracking. It exists in the registry but the UI needs building out for hospitality use cases.

---

#### `finance`
Chart of accounts, journal entries, fiscal periods, costing and margin.

**Requires:** `core`  
**Key permissions:** `account.manage`, `journal.post`, `journal.view`, `period.close`  
**Nav:** none (accessed through reports)

---

#### `projects`
Engagements, tasks, timesheets. The service-sector equivalent of production orders.

**Requires:** `core`  
**Key permissions:** `project.view`, `project.manage`, `timesheet.record`, `timesheet.approve`  
**Nav:** Projects

---

#### `assets`
Asset register, assignment, maintenance schedules, depreciation tracking.

**Requires:** `core`  
**Key permissions:** `asset.view`, `asset.manage`, `asset.maintain`  
**Nav:** Assets

---

#### `sites`
Named locations (outlets, client sites, branches) with managers, rosters, and checklists. Used by both facility management and franchise networks.

**Requires:** `core`  
**Key permissions:** `site.view`, `site.manage`, `site.deploy`  
**Nav:** Sites

---

#### `scheduling`
Calendar-based shift assignments per user and site, with swap requests.

**Requires:** `core`, `hr`  
**Key permissions:** `schedule.view`, `schedule.manage`, `schedule.swap`  
**Nav:** Scheduling

---

### Tier 3 — ₹7,000/month each (vertical-specific)

#### `automotive`
Vehicle catalogue (brand → model → generation → year → variant) and product fitment mapping.

**Requires:** `core`, `sales`  
**Vertical:** `auto_components` pack  
**Key permissions:** `vehicle_catalog.view`, `vehicle_catalog.manage`, `fitment.manage`

---

#### `kitchen_ops` ⚠️ *Not yet built — PRD 04 K1–K4*
HACCP-grade food safety. Ranged checkpoints with breach enforcement, oil quality log, HACCP export (CSV + print), breach alerting to area manager.

**Requires:** `core`, `quality`  
**Vertical:** `franchise_qsr` pack  
**Build status:** Planned. [`docs/prd/04-franchise-modules.md`](../prd/04-franchise-modules.md)

> **Kent's context:** This is the module that makes Verity genuinely useful for a restaurant beyond basic billing — temperature logs, fryer logs, the artefact a food-safety inspector actually asks for.

---

#### `field_compliance` ⚠️ *Not yet built — PRD 04 F1–F5*
Named zones per site, zone-level photo audits, violation taxonomy, cross-outlet comparison view, violation trend over time.

**Requires:** `core`, `quality`, `sites`  
**Vertical:** `franchise_retail` pack  
**Build status:** Planned. [`docs/prd/04-franchise-modules.md`](../prd/04-franchise-modules.md)

---

#### `franchise_ops` ⚠️ *Not yet built — PRD 04 O1–O5*
Unified outlet scoring (one function, both dashboards), HQ command centre, composite scoring (compliance + CSAT + sales), scheduled scorecard export, SOP seed templates.

**Requires:** `core`, `quality`, `sites`  
**Vertical:** `franchise_qsr`, `franchise_retail` packs  
**Build status:** Planned. [`docs/prd/04-franchise-modules.md`](../prd/04-franchise-modules.md)

---

## Module dependency graph

```
core (always on)
├── inventory
│   ├── manufacturing
│   └── procurement
├── hr
│   └── scheduling
├── sales
│   ├── crm
│   ├── billing
│   └── automotive  [T3, vertical]
├── quality
│   ├── kitchen_ops  [T3, vertical, planned]
│   └── field_compliance  [T3, vertical, planned]
├── sites
│   └── field_compliance  [T3, vertical, planned]
│   └── franchise_ops  [T3, vertical, planned]
├── helpdesk
├── finance
├── projects
└── assets
```

---

## Rules for new developers

1. **Every query must be tenant-scoped.** Use `findFirst({ where: { id, factoryId } })`, never `findUnique` by bare id.
2. **`factoryId` comes from the session.** No server action accepts it as a parameter — that's a parameter a caller can forge.
3. **Nav items are declared in the module manifest.** Do not add them to the shell. The resolver in `src/platform/modules/navigation.ts` reads the registry.
4. **Module deactivation hides, never deletes.** All historical data must survive.
5. **`guardModuleWrite()`** wraps every mutating server action. It blocks writes on `TRIAL_EXPIRED` and `READ_ONLY` subscriptions.

Full contract: [`docs/prd/00-module-system.md`](../prd/00-module-system.md)
