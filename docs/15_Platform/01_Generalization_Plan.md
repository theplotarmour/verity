# Verity: From One Vertical to a Generic Enterprise Platform

Status: proposed · Date: 2026-07-27 · Supersedes nothing

This plan is written against the actual repository, not a greenfield sketch. The
findings in §1 are what change the shape of the work, so read them before the
phases.

---

## 1. What is actually in the repo today

Three findings materially change the plan.

### 1.1 Verity is not a blank slate. Most of an ERP core is already modelled.

`prisma/schema.prisma` is 1,392 lines and 80 models. It already contains the
parts that are genuinely hard to get right:

| Area | Models already present |
|---|---|
| Inventory | `ItemMaster`, `StockLedgerEntry`, `BinBalance`, `MaterialReservation`, `UOMConversion` |
| Warehousing | `Warehouse` → `Zone` → `Rack` → `Shelf` → `Bin` |
| Manufacturing | `BOM`, `BOMItem`, `WorkOrder`, `JobCard`, `ProductionPlan`, `StageEntry`, `Blueprint(+Version, RouteStep)` |
| Procurement | `Supplier`, `PurchaseRequest`, `PurchaseOrder`, `PurchaseReceipt`, `PurchaseInvoice` |
| Sales | `Customer`, `Deal`, `SalesOrder`, `SalesOrderItem`, `Dispatch` |
| Quality | `QCTemplate`, `TemplateSection`, `Checkpoint`, `Inspection`, `QualityApproval`, `ReworkRecord` |
| Cross-cutting | `Approval`, `AuditLog`, `TimelineEvent`, `Notification`, `Comment`, `Attachment`, `WorkflowStage` |
| HR | `EmployeeProfile`, `Shift`, `AttendanceLog`, `LeaveApplication` |

A stock ledger with bin-level balances and reservations is the thing most
"build an ERP" attempts get wrong for two years. It exists here.

**Implication:** the bottleneck is not missing modules. Cloning ERPNext to
learn what a `StockLedgerEntry` is would be re-learning something the repo
already encodes.

### 1.2 There are two parallel product-definition systems, and the wrong one is load-bearing

A generic, config-driven product system already exists:

- `ProductType` (`schema.prisma:1110`) — comment reads *"Seat Cover, Table, Shirt"*
- `ProductField` (`schema.prisma:1123`) — comment reads *"Wood Type, Dimensions, Thread Color"*
- `FieldType` enum — TEXT, SELECT, NUMBER, MEASUREMENT, TOGGLE, BUTTONS, CHECKBOX
- `SalesOrder.dynamicData Json?` — the value store
- `ItemFieldDefinition` — the same idea for items

The generic intent was there from the start. But it is barely wired up:

```
dynamicData referenced in src/          →  7 places
seat/vehicle concepts referenced in src/ → 47 files
```

Meanwhile `SalesOrder` (`schema.prisma:1024-1030`) carries the automotive
domain as **first-class columns**:

```prisma
vehicleBrandId  String?
vehicleModelId  String?
vehicleYear     String?
seatType        String?
hasArmrest      Boolean @default(false)
headrestCount   Int?
```

…plus six dedicated models (`VehicleBrand`, `VehicleModel`, `VehicleGeneration`,
`VehicleYear`, `VehicleVariant`, `ProductVehicleFitment`) and a hardcoded
`SEAT_TYPES` / `HEADREST_COUNTS` in `src/lib/variant-descriptor.ts`.

Those columns propagate into job cards, labels, QC review, worker screens and
the **public verification passport** — the customer-facing artifact.

**This is the single thing blocking every other vertical.** A furniture or
services client does not have a headrest count. Today they would get a
`SalesOrder` with six dead columns and a variant descriptor that cannot
describe their product.

**Implication:** the core work is not building a configurability mechanism. It
is migrating the hardcoded path onto the generic mechanism that already exists,
then deleting the hardcoded one.

### 1.3 Multi-tenancy is asserted but not enforced

- `Factory` is the tenant. There is no `Organization` above it, so no
  multi-plant / multi-company / multi-currency grouping.
- **Zero row-level security.** `grep "ENABLE ROW" prisma/migrations/**/*.sql`
  returns 0. Tenant isolation is app-level `factoryId` filtering only — one
  forgotten `where` clause is a cross-tenant data leak.
- `Role` is a **hardcoded Prisma enum** (OWNER, CO_OWNER, MANAGER, SUPERVISOR,
  WORKER, STORE_MANAGER). Enterprises will demand custom roles; today that is a
  migration.
- `Permission` is a hardcoded TypeScript union of 15 strings
  (`src/lib/permissions.ts`) — and several are vertical-flavoured
  (`CREATE_ORDER` is labelled "Create production").
- `Factory.modulesEnabled` exists and is **written in two places
  (`src/server/actions/hq.ts:74,241`) and read in none.** Module gating is
  currently fiction.

**Implication:** selling to enterprises without RLS and custom roles is a
security and procurement blocker, independent of features.

---

## 2. Where I disagree with the brief

### 2.1 The stated stack is not the actual stack

The brief lists **Turborepo** and **Drizzle**. Neither is in the repo:
`grep "turbo|drizzle" package.json` → 0. It is a single Next.js app on
**Prisma**, no `packages/` directory.

**Recommendation: do not migrate to Drizzle, and do not adopt Turborepo yet.**

- A Prisma → Drizzle rewrite touches all 80 models and every server action,
  costs weeks, and buys nothing a customer can see. Prisma's weaknesses
  (bundle size, cold start) are not what is stopping Verity from selling to a
  furniture factory.
- Turborepo earns its keep when there is a second deployable — a worker
  service, a public API, a docs site. There is one Next.js app. Adopt it when
  the second thing exists, not before.

Revisit both after Phase 2. If they go in the plan now, they consume the budget
that §1.2 needs.

### 2.2 "Clone five repos to accelerate" — the licensing makes this mostly unusable

The brief proposes *"fork components from where licensing allows."* For a
commercial multi-tenant SaaS, that clause excludes almost the entire list.
Broad license classes (**verify each before use — these change**):

| Project | License class | Consequence for a hosted commercial Verity |
|---|---|---|
| ERPNext | GPL family | Copying code makes Verity GPL |
| Odoo Community | LGPL family | Viral on derivation |
| Twenty CRM | AGPL family | **Network-use trigger — hosting is distribution** |
| Plane | AGPL family | **Network-use trigger** |
| OpenProject | GPL family | Viral on derivation |
| Outline | Business Source License | Non-compete restrictions |
| Directus, NocoDB, Metabase, Budibase | BSL / AGPL / dual | Various, mostly incompatible |

**AGPL is the dangerous one.** It triggers on network use, not distribution —
running a modified copy as a SaaS obliges you to publish your source. For a
subscription product that is a business-model decision, not a legal footnote.

What is safe and genuinely valuable: **reading these systems to understand their
domain models, then implementing fresh.** Study how ERPNext structures its stock
ledger and how Odoo sequences procurement. Do not copy files, schema DDL, or
distinctive code structure. This is normal practice; the difference between
"studied" and "derived" is real and worth keeping clean.

Given §1.1, the highest-value study targets are narrow, not "five whole repos":

1. **ERPNext — accounting only.** It is the one major area Verity has *no*
   model for (no Account, JournalEntry, or FiscalPeriod). Double-entry is easy
   to get subtly wrong.
2. **Odoo — procurement orchestration.** Specifically how a demand signal
   becomes a PO across MTO/MTS. Verity has the nouns but not the orchestration.
3. **Everything else — defer.** Twenty/Plane/Outline are UI and UX references
   for modules that do not exist yet. Studying them now is research without a
   consumer.

### 2.3 The tagline now contradicts the strategy

`BRAND_NAME`/`BRAND_TAGLINE` in `src/lib/brand.ts` reads **"Verified
Manufacturing Intelligence."** If Verity is to serve service-sector clients,
that tagline excludes them on the login screen. It is a one-line change now and
a rebrand later. Suggest **"Verified Enterprise Intelligence"** or dropping the
sector word. (Not changed yet — this is a positioning call.)

---

## 3. The plan

Sequenced by what unblocks what. Phases 0–2 are the critical path; everything
else is parallelisable once they land.

### Phase 0 — Tenant and identity hardening

*Blocks: every enterprise sale. Do first.*

1. **Introduce `Organization` above `Factory`.** Factory becomes a site/plant.
   Org carries billing, currency, fiscal calendar, module entitlements.
   Migration: one Org per existing Factory.
2. **Enable Postgres RLS on every tenant-scoped table.** Supabase makes this
   native. Set the tenant in a session GUC and let the database enforce
   isolation, so a missing `where` is a failed query rather than a leak. This
   is the single highest-value security change available.
3. **Replace the `Role` enum with a `Role` table** (org-scoped, system roles
   seeded, custom roles allowed) and `Permission` with a registry that modules
   contribute to. Rename vertical-flavoured permissions
   (`CREATE_ORDER` → `sales_order.create`).
4. **Make `modulesEnabled` real** — a server-side guard, not a settings field.

**Done when:** a query without tenant context returns zero rows at the DB
level, and a custom role can be created without a migration.

### Phase 1 — Collapse the dual product-definition system

*Blocks: every vertical other than automotive. This is the main event.*

The mechanism exists (§1.2). The work is migration, in this order:

1. **Extend the generic layer to parity.** `ProductField` needs what the
   hardcoded path has: validation rules, conditional visibility
   (`productHasSeatSpecs` is this, hardcoded), option sourcing from master
   data, and a stable key for search.
2. **Move `variant-descriptor.ts` from hardcoded to template-driven.** Today
   `formatVariant` hardcodes `{Brand} {Model} {Gen} {Product} {SeatType}
   {HDR} {Arm} {Fabric} {Design}`. It becomes a per-`ProductType` format
   template over field keys. This file is the conceptual centre of the
   coupling — it is where the automotive assumptions are most load-bearing.
3. **Recast the automotive models as the first vertical pack.** `VehicleBrand`
   → `VehicleVariant` and `ProductVehicleFitment` stop being core schema and
   become an installable *Automotive* module that registers a hierarchical
   field type. Prove the module API by making the existing vertical consume it.
4. **Migrate `SalesOrder`'s six vehicle columns into `dynamicData`,** backfill,
   then drop them. Update the ~47 touching files behind an accessor rather than
   47 independent edits.
5. **Make the public passport template-driven.** It currently renders vehicle
   fields directly; it must render whatever the ProductType defines.

**Done when:** a furniture ProductType can be created through the UI and flow
end-to-end — order → job card → QC → label → public passport — with no
automotive field present anywhere, and no code change.

**This phase is the whole ballgame.** Until it lands, every new module is built
against a schema that assumes cars.

### Phase 2 — Module system

*Depends on: Phase 0.4*

Turn the implicit structure into a real contract. A module declares: schema
namespace, permissions, workflow states, navigation entries, event
subscriptions, settings, seed data. Core services (workflow, events, audit,
notifications, files, search, approvals) already exist as models — Phase 2
exposes them as the API modules build against, rather than shared tables that
modules reach into.

Prove it by extracting **Quality** (the most self-contained, best-developed
area) into a module. If QC can be uninstalled cleanly, the API is real.

### Phase 3 — Generic core services

Fill the gaps the module contract exposes: a real workflow/state-machine engine
(`WorkflowStage` is a data model, not an engine), an automation/rule builder,
document management with OCR, and search (Meilisearch or Typesense — this is a
genuinely good call in the brief; do not build search).

### Phase 4 — Module build-out

Order by dependency, not by demand:

1. **Finance / double-entry** — the one genuine gap (§2.2). Everything
   downstream needs it for costing and margin.
2. **Procurement orchestration** — nouns exist, orchestration does not.
3. **CRM** — `Customer` and `Deal` exist as stubs.
4. **Projects / Timesheets / Field Service** — this is what makes Verity sell
   to the **service sector**, which today it cannot address at all. Note that
   the entire current model assumes a physical good moving through stages; a
   consulting engagement has no `JobCard`. Expect this to surface assumptions
   Phase 1 misses.
5. Assets, HR expansion, Helpdesk, Compliance.

### Phase 5 — Per-client optimisation

Only meaningful once modules are installable: client config = enabled modules +
ProductTypes + workflow definitions + role set + branding. The reskin work
already done (`src/lib/brand.ts`, token-driven design system) means visual
white-labelling is close to free.

---

## 4. Immediate next step

**Do not start with modules.** Start with **Phase 1, step 2** — making
`variant-descriptor.ts` template-driven — as a spike. It is small, it is the
densest point of automotive coupling, and it will tell you within days whether
the generic field system is adequate or needs rework. That answer determines
the cost of everything else.

Second-best starting point is **Phase 0.2 (RLS)**, which is independent and can
run in parallel.

---

## 5. Open questions

1. **Is there production data?** The PIN salt rotation
   (`src/lib/server/hash.ts`) and its `SUPERSEDED_HASHES` migration path imply
   real users. Phase 1's column migration needs a backfill plan if so.
2. **Multi-currency / multi-company** — needed at Phase 0 (Org model) or
   deferrable? Affects the finance schema significantly.
3. **Is the automotive client a reference customer or a legacy obligation?**
   If they can absorb breaking changes, Phase 1 is far cheaper.
