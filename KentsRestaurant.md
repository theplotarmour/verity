# Kent's Restaurant, Defence Colony — Dine-In Capability Design

| | |
|---|---|
| **Client** | Kent's Restaurant, Defence Colony, New Delhi |
| **Document status** | **BUILT BASELINE / DESIGN AUTHORITY** — the dine-in capability now exists in `src/server/capabilities/dinein/`, is registered from `src/server/capabilities/registry.ts`, and has Prisma models for menu, floor, order, bill, and payment flows. This document remains the target design; built, provisional, and planned claims must still be checked against the code before reporting. |
| **Proposed capability id** | `verity.capability.dinein` |
| **Proposed pack framing** | None. This is one purpose-built reusable capability, not an industry pack (see §2.3). |
| **Platform state at 2026-09-01 update** | Foundation frozen at 2026-08-24 milestone (`implementation/PLATFORM-FREEZE.md`). Shipped capabilities now include Location, Asset, Evidence, Scheduling, Approval, Dine-in, and Plywood. Kent's is no longer only a proving requirement; its dine-in baseline is implemented as a capability-private client system. |

### 0.1 Architecture update from the last 3-4 days of commits

- **Current / built:** `verity.capability.dinein` ships as a capability-private implementation, not a platform kitchen/POS module.
- **Current / built:** menu categories/items/variants, zones/tables, dining orders/order lines, bills, payments, kitchen queue, open bills, and sales summary queries are registered commands/queries.
- **Current / built:** the latest platform registry installs both Dine-in and Plywood after the shared foundation capabilities.
- **Current / inherited UI architecture:** the accent-driven glass material and semantic token work applies to Kent's screens as well; dense bill and kitchen views should remain solid/legible where the design already requires it.
- **Still planned / target:** the ADR clarification around DEC-001 should still be retained as governance context: dine-in kitchen screens are allowed because they are client capability code, not a core KDS product.

---

## 1. Client requirements (as received)

Kent's Restaurant needs a simple system for table-service dining:

1. **Waiter phone/tab** — take orders at the table; mark a table as occupied.
2. **Kitchen cook tab/phone** — view incoming orders and what to cook.
3. **Billing counter tab/PC** — complete orders, take payment, free the table.
4. **Menu management** — maintain what can be ordered.
5. **Floor map for tables** — see and manage the physical layout of tables.
6. Everything else implied by running a single-outlet restaurant day to day.

Derived operational requirements (the "etc etc", made explicit so scope is testable):

- Table lifecycle beyond occupied: reserved, being cleaned, out of service.
- Order lifecycle beyond taken: sent to kitchen, preparing, ready, served, billed, paid, cancelled.
- Per-item kitchen progress (a 12-item order is not done when one dish is).
- GST-compliant bill with itemised lines, taxes and totals; printed or shown at the counter.
- Day-end sales summary.
- Staff roles: owner/manager, waiter, cook, cashier — each seeing only their own surface.
- Live-enough views: kitchen must see new tickets within seconds without anyone pressing refresh on their behalf.

Explicitly **not** requested and therefore out of scope for v1 (§15): reservations with time-slot booking, deliveries/takeaway channels, customer-facing ordering, loyalty/CRM, inventory/recipe depletion, payment gateway integration, POS hardware (cash drawers, payment terminals), KOT printers as a control path.

---

## 2. Authority position

### 2.1 The decision path this document follows

`implementation/PLATFORM-FREEZE.md` fixes the path for the next requirement: *can existing Verity primitives support it? If yes, build the capability; if no, smallest additive extension justified in writing.* This document answers that question module by module (§16). Its headline answer: **every Kent's requirement lands on existing primitives except five named gaps**, each recorded as a decision in §17 rather than silently solved.

### 2.2 Conflict flagged: DEC-001 (Kitchen Module & KDS exclusion)

Bible V6 decision register **DEC-001 [FACT, ACCEPTED]** permanently excludes a *Kitchen Display System / cooking-queue product feature* from Verity core, because recipe micro-inventory and bump timers do not generalise. Kent's requirement #2 asks for exactly a kitchen order view.

Resolution proposed here (and nowhere else assumed):

- DEC-001 excludes a **core product module**. It does not forbid *purpose-built code inside a client capability* — which PLATFORM-FREEZE explicitly encourages ("purpose-built implementation… hard-coded domain rules, a bespoke screen").
- The Kent's kitchen surface is therefore specified as screens of `verity.capability.dinein`, consuming only public runtime contracts (`registerCommand`, `QueryDefinition`, `TransitionDefinition` reads). Nothing enters `src/server/platform/`, no bump-timer abstraction, no recipe engine, no generalisable KDS vocabulary.
- **Classification: conflicting specification / missing ADR.** A short ADR recording "DEC-001 stands for core; dine-in kitchen screens are capability-private" should be ratified before build. Until then this line of the design is provisional. Stop condition honoured: not improvised, surfaced here.

### 2.3 Scope note: GOV-SCO-006 and pack framing

GOV-SCO-006 places consumer retail storefronts and POS hardware outside platform scope. Kent's billing counter is consequently designed as **record-and-print** (record payments, render a printable bill) — no cash-drawer registry, no payment-terminal integration, no barcode scanning. Should Kent's later demand terminal integration, that is a new requirement against §17's decision path, not an extension of this design.

The spec's industry packs (`13_industry_packs/`) cover Facilities, Field Service, Maintenance, Professional Services, Security Operations, Staffing — hospitality is absent from the corpus. This document therefore does **not** invent a "restaurant pack". One capability, activated per tenant, is sufficient for a single-outlet restaurant and avoids re-introducing the forbidden `franchise_qsr`-style hardcoded pack keys.

### 2.4 Canonical terminology compliance

All names below respect GOV-TER-001..017. Two deliberate term choices need stating:

- **`DiningOrder` is the domain's Work instance.** Bible V2 defines WORK as the primary execution primitive; a table-service order is precisely a unit of service execution moving through states under commands. It is *not* called a ticket, job card or `event_run`.
- **`OrderLine` is a capability-owned entity, not `ChecklistItem`.** ADR-006 reserves ChecklistItem for work sub-steps and Task for project milestones. An order line is a commercial line item (quantity × price snapshot × independent kitchen progress); forcing it into checklist semantics would corrupt both. ChecklistItem remains untouched and unused by this capability.

No legacy-VEDA vocabulary appears anywhere in this design (no `factoryId`, no SalesOrder automotive columns, no `SystemRole` enum, no `/owner`-style role routes, no `.verity-glass`).

---

## 3. Platform fit — requirement → primitive map

| Kent's requirement | Existing primitive that carries it | Status of primitive |
|---|---|---|
| Tenant isolation for one restaurant | Tenant + RLS via `withTenant()`; fail-closed GUC | BUILT / PROVEN |
| Staff logins | Supabase Auth + Party/User/TenantMembership via `provisionIdentity()` | BUILT / PROVEN |
| Waiter / Cook / Cashier / Manager roles | Role + Permission (Verb+Entity+Scope), `verity.resolve_permissions`, RoleComposition | BUILT / PROVEN |
| Menu items, zones, tables, orders as first-class data | Capability-owned Prisma tables registered in `EntityDefinition` (MET-ENT-001..005) | BUILT |
| Order taking, kitchen progress, billing, payment settlement | Command pipeline MET-ACT-001..004 (`executeCommand`) | BUILT |
| Table/order lifecycles | StateDefinition / TransitionDefinition / StateCategory (ADR-009), `assertMutable` INV-002 lock | BUILT / PROVEN |
| Audit of every change | Activity stream + DomainEvent outbox, append-only triggers | BUILT / PROVEN |
| Kitchen prep-time discipline | SLA substrate: SlaPolicy/SlaClock driven by StateCategory, `urgencyFor()` | BUILT (sweep needs scheduler binding — §17-D2) |
| "Order ready" pings | Notification substrate (`notify()`, templates, suppression recorded) | BUILT (transport dispatcher unbound — §17-D4) |
| Floor-map editor persistence | Base-entity pattern + custom fields (PLA-EXT-001..003) | BUILT |
| Bill photos/menu photos | StoredFile two-phase contract | BUILT (driver unbound — §17-D3) |
| Waiter device flakiness | OfflineCommand inbox + replay + SyncException | Substrate BUILT (device UI unwired — §17-D8) |
| Manager dashboards/reports | Server components + chart primitives (Donut/BarStrip/StairFigure), workspace contributions | BUILT |
| Look & feel | ADR-011 glass material system, accent presets, shell chrome | BUILT |

Everything else in this document is capability code: tables under `prisma/schema.prisma` (additive), one directory `src/server/capabilities/dinein/`, routes under `src/app/(shell)/dinein/…` plus three worker-shell surfaces, registration in `src/server/capabilities/registry.ts`, migration-seeded metadata rows, one `registerContribution()` call. Per PLATFORM-FREEZE, all of that is expected-and-additive, not a platform change.

---

## 4. Tenant & organization topology

```
Tenant: "Kent's Restaurant"                timeZone: Asia/Kolkata (explicit, never guessed)
└── Organization: "Defence Colony"         (single outlet; hierarchy ready for outlet #2)
    └── Location: "Kent's Defence Colony"  (operational site; Place+Address attached)
```

- One Tenant = the legal business; ADR-005 boundary. A second outlet later becomes a second Organization + Location inside the same tenant — no schema change, and Organization-scoped grants begin to matter then.
- `Organization.timeZone` inherits the tenant's `Asia/Kolkata`; all instants stored UTC, rendered via `temporal.ts` (`formatInZone`). Authority: Bible V4 §5.B, EXE-SCH-001.
- BusinessCalendar "Restaurant Hours" (tenant-wide) with per-weekday windows and holidays — feeds SLA wall-clock vs working-minute choice (§10) and future reports.
- Capability activation: `TenantActivation(verity.capability.dinein)` pins the capability version at go-live (PLA-CAP-002, PLA-VER-003).
- Accent: tenant chooses a preset in Appearance settings; default Warm Sand Gold `#D4A017` stands unless Kent's picks another (e.g. Emerald). Never hard-coded; everything derives from `--accent-seed`.

Onboarding runbook: §13.

---

## 5. Staff identity, roles & permissions

### 5.1 People

Every staff member gets one global Party + User via `provisionIdentity()` (never direct INSERT — RLS denies it deliberately) bound to the Defence Colony organization with one membership each. No guest is ever provisioned as a Party in v1 (§6.6 explains why).

Shared tablets are a reality in restaurants; authentication on a shared device is currently per-person Supabase sign-in. A PIN-per-staff fast-switch over shared sessions is a **security decision needing an ADR** (§17-D7) — not improvised here.

### 5.2 Roles

Closed set for v1. `Manager` composes the other three via RoleComposition (PLA-AUT-001) rather than repeating their grants; composition flattening stays DB-side in `verity.resolve_permissions`.

| Role | Purpose | Composition |
|---|---|---|
| `Owner` | Kent himself; full control incl. configuration and audit | composes `Manager` |
| `Manager` | Runs shifts; everything operational + menu/floor/staff admin | composes `Waiter`, `Cook`, `Cashier` |
| `Waiter` | Floor service: occupy tables, take orders, mark served | — |
| `Cook` | Kitchen: advance item states | — |
| `Cashier` | Counter: bills, payments, vacate-after-payment | — |

### 5.3 Permission matrix

Verbs from the closed set (PLA-AUT-003); bespoke actions ride `ActionExecute`. All grants at `Tenant` scope — single outlet, so Organization/Location scopes stay unused (correct, since a Location-scoped grant reaches nothing today anyway). `entity` values are the EntityDefinition keys of §6.

| Entity | Read | Create | Edit | Delete | ActionExecute |
|---|---|---|---|---|---|
| `verity.dinein.menu_category` | W C M O* | M O | M O | — | — |
| `verity.dinein.menu_item` | W C M O | M O | M O | — | — |
| `verity.dinein.menu_variant` | W C M O | M O | M O | — | — |
| `verity.dinein.zone` | W C K M O | M O | M O | — | — |
| `verity.dinein.table` | W C K M O | M O | — | — | occupy/reserve/clean/release/retire (M O; occupy+release also W) |
| `verity.dinein.order` | W C K M O | W M O | — | — | place/add-lines/void-line/cancel/transfer (W M O per command) |
| `verity.dinein.order_line` | W C K M O | (via add_lines) | — | — | advance-state (K for queued→preparing→ready; W for →served) |
| `verity.dinein.bill` | K? M C O† | C M O | — | — | discount (M O), void (O), settle (C M O) |
| `verity.dinein.payment` | M C O | C M O | — | — | — |

\* W=Waiter, C=Cook, K=Kitchen uses same role as Cook, M=Manager, O=Owner.
† Cooks do **not** read bills — revenue visibility is none of the kitchen's business and keeps the kitchen tab minimal. Adjusted freely during ratification; the matrix is data, not code.

Notes:

- Deleting menu items is never granted — items retire through state, preserving historical bills' referential integrity (prices are snapshotted onto order lines anyway).
- Field restriction demo: `costMinor` on `menu_item` gets a `FieldPermission` row; only Manager/Owner hold `Read` on `verity.dinein.menu_item#costMinor`, so `redactFields()` omits cost from every waiter/cook response. Margin data never reaches a shared tablet.

---

## 6. Domain model — modules and entities

Six modules, one capability. Every entity follows the base-entity pattern exactly (`id, tenantId, createdAt, updatedAt, version, customFields` — bootstrap-sequence step 7), lives in a capability section of `prisma/schema.prisma`, is installed by a migration following the Location exemplar (tables → ENABLE+FORCE RLS → isolation policies → INSERT `capability_definition` / `entity_definition` rows ON CONFLICT DO NOTHING → seed states/transitions), and carries zero platform edits.

Money convention: **integer minor units (paise)** in every amount column (`priceMinor`, `amountMinor`, `taxMinor`), currency `INR` from config. Integer money avoids float drift in totals; the precedent is Bible V6 DEC-002's `pricePaise`. Final representation ratified at build review (§17-D6). All totals are computed server-side inside commands; clients only ever display them.

### Module M1 — Menu (`verity.capability.dinein`, entities prefixed `verity.dinein.menu_*`)

Features: categories with sort order; items with price, description, veg flag (custom field example below), photo, availability toggle; portion variants with price deltas; price changes never rewrite history (lines snapshot).

Entities:

- **MenuCategory** `verity.dinein.menu_category` — `name`, `sortOrder Int`, `active Boolean`.
- **MenuItem** `verity.dinein.menu_item` — `categoryId FK`, `name`, `description String?`, `priceMinor Int` (CHECK ≥ 0), `active Boolean @default(true)`, `imageFileId FK → StoredFile?` (two-phase upload contract), `sortOrder Int`.
  - Custom fields (per-tenant, PLA-EXT-002): e.g. `veg` (Select: Veg/Non-Veg/Egg), `spice` (Select), `jain_option` (Boolean). Declared as `CustomFieldSchema` rows at provisioning — validated server-side by `compileCustomFieldValidator` on every write, no migration.
- **MenuItemVariant** `verity.dinein.menu_variant` — `itemId FK`, `name` ("Half"/"Full"), `priceDeltaMinor Int`.

Inactive items disappear from ordering surfaces but remain readable for history. Retiring ≠ deleting; there is no Delete grant at all.

### Module M2 — Floor (`verity.dinein.zone`, `verity.dinein.table`)

Features: zone grouping (Ground Floor, Mezzanine, Terrace…); table master data (label, seats, shape); drag-to-position floor map editor persisting coordinates; live status colouring; out-of-service marking.

Entities:

- **DiningZone** `verity.dinein.zone` — `name`, `floorLabel String?`, `sortOrder Int`.
- **DiningTable** `verity.dinein.table` — `zoneId FK`, `label` ("T-12"), `seats Int`, `shape Select`(via custom field or native `shape String?`), `posX Int`, `posY Int` (floor-plan canvas coordinates), `state String @default("available")`, `activeOrderId String?` (denormalised link maintained exclusively by commands, §8).

Why not Asset/Resource/Booking (ADR-008 machinery)? Considered and rejected for v1: occupancy is discrete state machine behaviour, not calendar scheduling; Booking's overlap trigger solves double-booking, while double-seating here is prevented structurally (occupy precondition: table `available`). When Kent's wants true time-slot reservations, tables become Resources backed by Assets and reservation slots become Bookings — an additive extension path that ADR-008 already shapes. Recorded in §17-D9 rather than built speculatively.

### Module M3 — Service (ordering) (`verity.dinein.order`, `verity.dinein.order_line`)

Features: occupy table with covers; cart-as-draft on the table (uncommitted intake — semantically the spec's Request notion, expressed as the order's Draft state rather than a second entity); category-tabbed menu browsing with search; multi-add with quantities and variant choice; per-line notes ("no onion"); send-to-kitchen with immutable price snapshot; add items after sending (new lines land in kitchen queue); void line pre-preparation (manager-or-self rules below); cancel whole order; transfer order to another table.

Entities:

- **DiningOrder** `verity.dinein.order` — `tableId FK`, `takenByUserId FK` (actor from context, never payload — PLA-TEN-006), `covers Int`, `placedAt DateTime?`, `servedAt DateTime?`, `state String @default("draft")`, `customerName String?`, `customerPhone String?` (optional, for the occasional GST B2B invoice — plain fields, NOT a Party; §6.6).
- **OrderLine** `verity.dinein.order_line` — `orderId FK`, `itemId FK`, `variantId FK?`, `itemNameSnapshot String`, `variantNameSnapshot String?`, `unitPriceMinor Int` (frozen at place-time), `qty Int`, `lineNote String?`, `state String @default("queued")`.

Why lines snapshot name and price: menu edits are forward-looking; a bill from last month must render exactly what was charged even after the item is renamed, repriced or retired. Same principle as Evidence immutability.

Concurrency: two waiters adding to one order resolve through the ubiquitous `version` column — `updateWithVersion()` yields `E_CONFLICT` retryable failure; the client island re-reads and re-applies. Idempotency for flaky café Wi-Fi arrives with the offline queue (§17-D8); until then retries are user-visible failures, not silent duplicates.

### Module M4 — Kitchen

No new entities — the kitchen surface is a projection-style reading of `order_line` + `order` + `sla_clock` (queries only; §12.3). Features: queue board grouped by state; oldest-first within state; SLA urgency badges from `urgencyFor(remainingMinutes)`; one-tap state advances; recall of an accidental tap is *not offered* (transitions don't declare backwards edges; structural guard blocks it by absence — correcting a mis-tap means manager intervention via a declared corrective edge, decided in ratification).

This is the DEC-001 reconciliation point (§2.2): a purpose-built screen over public contracts inside the capability — no bump timers, no recipe logic, no platform KDS vocabulary.

### Module M5 — Billing (`verity.dinein.bill`, `verity.dinein.payment`)

Features: generate bill from an order (or several orders later-merged — v1 one-to-one); line recap with snapshots; configurable tax application (CGST+SGST split, inclusive/exclusive pricing, service charge toggle) from ConfigParameter; manager discounts (permission-gated); record payments (cash/card/UPI reference); auto-settle when paid-in-full; print via browser print stylesheet (bill route renders a print-clean solid layout — dense financial text stays solid per ADR-011); vacate table on settlement (command chains table → cleaning).

Entities:

- **Bill** `verity.dinein.bill` — `orderId FK UNIQUE` (v1), `subtotalMinor Int`, `discountMinor Int @default(0)`, `taxBreakdown Json` (`{cgstMinor, sgstMinor, rateApplied}` — computed once at generation), `totalMinor Int`, `roundingMinor Int @default(0)`, `state String @default("open")`, `generatedByUserId FK`, `settledAt DateTime?`.
- **Payment** `verity.dinein.payment` — `billId FK`, `method String` (cash/card/upi), `amountMinor Int`, `reference String?` (UPI txn id), `receivedByUserId FK`.

Split-bill-across-payments works naturally (many Payment rows until settled); splitting *items* across bills does not exist in v1 (§15).

Tax computation lives in one server function invoked by `generate_bill`; rates come from ConfigParameter keys (`verity.dinein.tax.cgstRate` etc., Tenant scope), never hardcoded — changing GST belongs to configuration, and PRN-001 demands the math be visible on the bill (rate printed alongside each tax line).

### Module M6 — Reporting

No new entities — queries over events/bills/tables. Features: daily sales summary; item mix; table turnover; waiter-wise order counts; tax summary for filing; live operations panel (occupied tables, open bills, tickets in kitchen). Catalogue in §14.

### 6.6 Why guests are not Parties (stated, not silent)

ADR-001 makes Party a bare identity primitive; ADR-007 ties identity creation to invitation+verification through `provisionIdentity()`, which also mints a User. Walk-in diners have no login and must not mint platform identities. So v1 records guests as anonymous covers plus optional plain-text name/phone on the order for invoice purposes. A future CRM capability owns real guest profiles (regulars' birthdays, feedback) — that capability would link its own records to Parties properly. Growing Party into "customer with a birthday" here would repeat the exact drift CLAUDE.md forbids.

---

## 7. State machines

Seeded as `StateDefinition` + `TransitionDefinition` rows in the install migration (global metadata, written by migration role — the established pattern). Category bindings follow ADR-009; only Completed/Cancelled are terminal; INV-002 locks terminals permanently.

### DiningTable `verity.dinein.table`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `available` | Active | no | Seatable now (initial) |
| `occupied` | Active | no | Guests seated, order open |
| `reserved` | Pending | no | Held for expected guests (manual hold v1) |
| `cleaning` | Blocked | no | Being turned around |
| `out_of_service` | Pending | no | Temporarily unusable (broken chair…) |
| `retired` | Cancelled | **yes** | Removed from floor permanently |

Transitions: available→occupied · available→reserved · available→out_of_service · available→retired · reserved→occupied · reserved→available · occupied→cleaning · cleaning→available · out_of_service→available · out_of_service→retired. Nothing reaches `occupied` except through commands whose preconditions check order state; nothing leaves `retired` ever (INV-002).

### DiningOrder `verity.dinein.order`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `draft` | Draft | no | Cart on an occupied table; not yet sent (initial) |
| `placed` | Active | no | Sent to kitchen; prep clock runs |
| `partially_served` | Active | no | Some lines served, kitchen still working |
| `served` | Completed | no | Execution terminal (ADR-003 decoupling) — awaiting bill |
| `billed` | Pending | no | Bill open; waiting on payment (clock stopped long ago) |
| `settled` | Completed | **yes** | Paid and closed — INV-002 lock |
| `cancelled` | Cancelled | **yes** | Voided before any line was served |

Transitions: draft→placed · draft→cancelled · placed→partially_served · placed→served (single-sweep orders) · partially_served→served · served→billed · billed→settled · placed→cancelled · partially_served→cancelled (only while no line has reached `ready`; transition guard enforces). `served` non-terminal but Completed: the SLA clock stops there, history keeps any breach, and the administrative tail (bill, pay) proceeds — exactly ADR-003's Completed/Closed split with `settled` playing Closed.

### OrderLine `verity.dinein.order_line`

| State | Category | Terminal | Meaning |
|---|---|---|---|
| `queued` | Pending | no | In kitchen queue (initial) |
| `preparing` | Active | no | Cook started it — line clock runs |
| `ready` | Completed | no | On the pass, awaiting pickup |
| `served` | Completed | no | At the table |
| `voided` | Cancelled | **yes** | Cancelled before serving |

Transitions: queued→preparing · queued→voided · preparing→ready · preparing→voided (manager only — burned/ruined dish) · ready→served · ready→voided (manager only — item unavailable after start). No backwards edges anywhere.

### Bill `verity.dinein.bill`

| State | Category | Terminal |
|---|---|---|
| `open` | Active | no (initial) |
| `settled` | Completed | **yes** |
| `voided` | Cancelled | **yes** (owner ActionExecute, precondition: no payment rows) |

---

## 8. Command catalog

Every row: MET-ACT-001 zod input, MET-ACT-002 authorize, MET-ACT-003 preconditions, transactional mutation, MET-ACT-004 outbox events, Activity diff where fields change. Keys namespaced `verity.dinein.*`.

| Command key | Verb | Actor(s) | Key preconditions | Emits |
|---|---|---|---|---|
| `verity.dinein.create_menu_category` | Create | M O | name unique per tenant | `menu_category.created` |
| `verity.dinein.create_menu_item` | Create | M O | category active | `menu_item.created` |
| `verity.dinein.edit_menu_item` | Edit | M O | — (works on retired too for corrections) | `menu_item.edited` + Activity diff |
| `verity.dinein.set_menu_item_active` | ActionExecute | M O | — | `menu_item.activated/.deactivated` |
| `verity.dinein.create_menu_variant` | Create | M O | item active | `menu_variant.created` |
| `verity.dinein.define_zone` / `edit_zone` | Create/Edit | M O | — | `zone.defined/.edited` |
| `verity.dinein.define_table` | Create | M O | zone exists; label unique per tenant | `table.defined` |
| `verity.dinein.position_table` | Edit | M O | — | Activity diff (posX/posY) |
| `verity.dinein.occupy_table` | ActionExecute | W M O | table `available` (or `reserved` held-for-this via override flag M-only); sets state `occupied` | `table.occupied` |
| `verity.dinein.reserve_table` | ActionExecute | W M O | table `available` | `table.reserved` |
| `verity.dinein.mark_table_cleaning` | ActionExecute | W M O | table `occupied`, order settled/cancelled | `table.cleaning_started` |
| `verity.dinein.release_table` | ActionExecute | W M O | table `cleaning` or `reserved` or `out_of_service` | `table.released` |
| `verity.dinein.take_table_out_of_service` | ActionExecute | M O | not `occupied` | `.table_out_of_service` |
| `verity.dinein.retire_table` | ActionExecute | M O | not `occupied`; no open order | `table.retired` (terminal) |
| `verity.dinein.create_order` | Create | W M O | table `occupied`; no open order on table | `order.created` |
| `verity.dinein.add_order_lines` | Edit | W M O | order `draft` or `placed`..`partially_served` (post-place additions allowed; lines start `queued`); items active; optimistic version on order | `order.lines_added` |
| `verity.dinein.place_order` | ActionExecute | W M O | order `draft`, ≥1 line; snapshots prices; starts clocks | `order.placed` |
| `verity.dinein.advance_order_line` | ActionExecute | K (queued→preparing→ready), W (→served) | declared transition only; `assertMutable` | `order_line.advanced` (+ category-driven clock events via `applyStateToClocks`) |
| `verity.dinein.void_order_line` | ActionExecute | W(queued only) M O | target states per §7 | `order_line.voided` |
| `verity.dinein.cancel_order` | ActionExecute | M O | order draft/placed/partially_served AND no line `ready`+ (guard) | `order.cancelled` |
| `verity.dinein.transfer_order` | ActionExecute | M O | target `available`; source left `cleaning` | `order.transferred` |
| `verity.dinein.generate_bill` | Create | C M O | order `served`; no open bill; computes subtotal/discount-eligible base/taxes/total atomically | `bill.generated` |
| `verity.dinein.apply_bill_discount` | ActionExecute | M O | bill `open`; discount ≥ 0; recomputes total | `bill.discount_applied` |
| `verity.dinein.record_payment` | Create | C M O | bill `open`; amount > 0; overpayment rejected (tip-less house rule v1) | `payment.recorded` |
| `verity.dinein.settle_bill` | ActionExecute | C M O | Σpayments ≥ total; marks bill `settled`, order `settled`, chains table → `cleaning` | `bill.settled` + `table.cleaning_started` |
| `verity.dinein.void_bill` | ActionExecute | O | bill `open`; zero payments | `bill.voided` |

Queries (`QueryDefinition`, Layer 2 `ctx.scope()` / Layer 3 redaction applied automatically to top-level arrays): `list_menu`, `list_tables_live` (zones+tables+active order summaries — the floor map feed), `get_order_detail`, `kitchen_queue` (lines joined to order/table/sla urgency, filtered by state set), `list_open_bills`, `get_bill_detail`, `sales_summary`, `item_mix`, `table_turnover`, `staff_activity`.

Registration wiring (exactly like every existing capability): constants + definitions in `src/server/capabilities/dinein/index.ts` (split per-module files if it grows), one `registerDineinCapability()` calling `registerContribution` + `registerCommand*` + `registerQuery*`, and one line in `registry.ts`'s `installCapabilities()`.

---

## 9. Events & audit

Every command above emits facts to the DomainEvent outbox inside its own transaction (MET-ACT-004 structural guarantee — rollback takes its events). Downstream consumers today: the Overview page's recent-events table, audit trail, and (once bound) workflow automations.

High-value derived facts worth naming because pages key off them:

- `verity.dinein.order_placed` — kitchen queue insert
- `verity.dinein.order_line.advanced` — kitchen board move + waiter "ready" interest
- `verity.dinein.bill.settled` — day-close aggregation, turnover stats
- `verity.dinein.sla.breached` (platform event from `sweepBreaches`) — manager alert feed

Audit: `recordActivity` + `diffFields` on every mutating command (price edits, state moves, discounts, voids). Financial mutations (discount, void, settle) additionally carry actor identity implicitly through `Activity.actorUserId` — after-the-fact "who discounted table 9" is a query, not an investigation. Security stream (`SecurityAuditEvent`) already captures role assignment and configuration changes made during staff onboarding.

---

## 10. SLA application

One `SlaPolicy` seeded per tenant: entity `verity.dinein.order_line`, name "Kitchen prep target", `targetMinutes` from config (e.g. 12), null calendar (wall-clock — kitchens run on elapsed minutes, not working-hours math; the BusinessCalendar exists anyway for reporting hours).

Behaviour falls out of the substrate with zero clock code, because states declare honest categories (MET-STA-004):

- line `queued` (Pending) → clock idle; `preparing` (Active) → clock starts, deadline computed; `ready`/`served` (Completed) → clock stops, breach preserved if overrun ("does not launder history").
- `sweepBreaches()` flips overdue Running clocks to Breached and emits `verity.sla.breached`.
- Kitchen board shows `urgencyFor(remainingMinutes)` — none/low/medium/high/critical/breached — a computed axis, separate from any business priority (Bible V4 §5.B separation respected).
- Later refinement (per-category prep targets: tandoor vs drinks) rides the existing precedence rule + `overrideDeadlineAt` — policy rows, not code.

**Binding requirement:** `sweepBreaches` and the notification drain are idempotent scheduled units (`ScheduleContribution`, cadence `"frequent"`), but nothing invokes them until a provider adapter is bound (§17-D2). Kent's is precisely the concrete requirement PLATFORM-FREEZE says should force that binding.

---

## 11. Notifications

Templates seeded per tenant (NotificationTemplate rows, literal `{name}` substitution only):

| Template key | Channel | Recipient(s) | Trigger |
|---|---|---|---|
| `verity.dinein.item_ready` | InApp | order's `takenByUserId` | line → `ready` |
| `verity.dinein.order_ready` | InApp | waiter | last line → `ready` |
| `verity.dinein.prep_breach` | InApp | all Manager-role users (membership query) | `sla.breached` handler |
| `verity.dinein.day_close_reminder` | InApp | C M O | daily schedule declaration (when provider bound) |

Suppressed notifications are recorded, never dropped — "why didn't the waiter get told" stays answerable. Push channel exists in the enum; wiring a transport is §17-D4. In-app alone suffices for v1 given every surface polls (§12.7) — notifications there function as badge counts and the bell feed.

---

## 12. Experience design

### 12.1 Shell strategy

Bible V4 §2 names four shells; the repo ships one adaptive platform shell deliberately, worker shell deferred (§27 brief). Kent's surfaces split accordingly:

- **Manager/Owner** → the existing `(shell)` platform console. Capability contributes navigation entries (`group: "Capabilities"` / `"Administration"`, `requiresEntity` gates) and workspace queues (real counts: open bills, tickets in kitchen, tables needing cleanup). Zero shell edits.
- **Waiter / Kitchen / Counter** → three purpose-built touch surfaces under a new `(worker)` route group, contributed with `shells: ["worker"]` so they never appear in the admin sidebar (the contribution contract already partitions by ShellKind). They share the sign-in, auth, theme tokens and material system but use a task-chrome layout (top bar + single pane, ≥44px targets everywhere, restructure-not-shrink doctrine §26).

Full Worker Shell chrome (persistent offline banner, My-Day landing etc.) is more than Kent's needs; building the three surfaces inside the existing law (tokens, materials, primitives, responsive specs) is the smallest honest step. Flagged as §17-D5 rather than silently half-building a fourth shell.

### 12.2 Page inventory — Waiter surface (`/floor`)

| # | Route / component | Purpose | Key actions (commands) | Permission gate |
|---|---|---|---|---|
| W1 | `/floor` FloorMap | Live grid/map of zones and tables, colour = state category, badge = covers + elapsed minutes | tap table → detail sheet; long-press actions: reserve, release, out-of-service (role-gated) | Read `table` |
| W2 | `/floor/[tableId]` Table sheet (overlay) | Table state, active order summary, occupies/releases | `occupy_table` (covers prompt) → navigates to order; `mark_table_cleaning`, `release_table` | ActionExecute per §8 |
| W3 | `/floor/[tableId]/order` Order pad | Line list w/ states, running total; add-items entry; place/send | `create_order`, `add_order_lines`, `place_order`, `void_order_line`, `cancel_order` | per §8 |
| W4 | Order pad → Menu browse (child sheet) | Category tabs, search, veg filter (custom field), qty steppers, variant chooser, note field | adds to local cart → batched `add_order_lines` | Read `menu_item` |
| W5 | `/floor/mine` My orders | Orders I took, kitchen progress per line, "all ready" highlight | jump to table; `advance_order_line` (→served) | Read `order` |
| W6 | Transfer dialog (from W3 overflow) | Move order to another free table | `transfer_order` | M O |

### 12.3 Page inventory — Kitchen surface (`/kitchen`)

| # | Route / component | Purpose | Key actions | Gate |
|---|---|---|---|---|
| K1 | `/kitchen` Queue board | Columns Queued / Preparing / Ready; cards = line items grouped by order+table label; age + urgency badge (SLA); oldest first | tap card → `advance_order_line`; filter chips (zone, veg/non-veg via item custom field) | Read `order_line`, ActionExecute |
| K2 | Ticket drawer (overlay) | Full order context for a card: all lines, notes, covers, elapsed | advance individual lines | same |
| K3 | `/kitchen/all-day` Optional flat list mode | Dense single-column alternative for small phones; same data, list rendering | same as K1 | same |

Deliberately absent: edit prices, see bill amounts, void without manager (matrix denies), any back-navigation into admin surfaces.

### 12.4 Page inventory — Counter surface (`/counter`)

| # | Route / component | Purpose | Key actions | Gate |
|---|---|---|---|---|
| B1 | `/counter` Open bills | Bills open + served-orders-awaiting-bill queue | select → bill detail; `generate_bill` shortcut from served orders | Read `bill`/`order` |
| B2 | `/counter/[billId]` Bill detail | Itemised recap, tax breakdown w/ rates, discount control, payment entry (method + amount + UPI ref), paid-so-far, settle button, Print | `apply_bill_discount` (M O), `record_payment`, `settle_bill`, `void_bill` (O) | per §8 |
| B3 | `/counter/print/[billId]` Print view | Browser-print stylesheet: solid surfaces only, logo, GSTIN/FSSAI lines (tenant config), itemised tax, footer | window.print() | Read `bill` |
| B4 | `/counter/day` Day summary | Today: net sales, tax collected, payment-method split, bill count, avg ticket; live-updating | — | Read `bill` |
| B5 | Vacate flow (post-settle banner) | Confirms table moved to cleaning; deep-link back to `/floor` | `mark_table_cleaning` confirmation | W M O |

### 12.5 Manager pages (existing platform shell, contributed navigation)

| # | Route | Purpose | Notes |
|---|---|---|---|
| M1 | `(shell)/dinein/menu` + `[id]` | Menu CRUD, variants, active toggles, photo upload (StoredFile two-phase once driver bound), reorder | DataTable + detail-page pattern; custom-fields editor reused from locations pattern |
| M2 | `(shell)/dinein/floor` | Zone/table master data + **floor map editor**: draggable table nodes on scaled canvas, save positions (`position_table`) | Only editing surface; operational floor map is W1 |
| M3 | `(shell)/dinein/orders` | Historical orders, filters (date/waiter/state), detail drill-down w/ audit trail | read-mostly |
| M4 | `(shell)/dinein/bills` | Bill history incl. voided; discount/void audit visible | read-mostly |
| M5 | `(shell)/dinein/reports` | §14 catalogue rendered with Donut/BarStrip/StairFigure; date-range picker | server-rendered SVG charts, no client JS |
| M6 | `(shell)/dinein/live` | Ops panel: floor snapshot + kitchen depth + open bills in one screen | the manager's glanceable page; candidate workspace-queue links |
| M7 | staff administration | Uses existing platform surfaces where present; **gap:** no membership/role UI exists yet — staff onboarding currently script/seed-level (§17-D10) | |
| M8 | `(shell)/configuration` (existing) | Tax rates, service charge, prep target minutes, rounding rule, GSTIN/FSSAI display strings, accent preset | ConfigParameter-backed; AppearanceControls already there |

Navigation contributions (illustrative): `{href:"/dinein/menu", label:"Menu", icon:"catalog-ish", group:"Capabilities", requiresEntity:"verity.dinein.menu_item", shells:["platform"]}`, similarly floor/orders/bills/reports/live; worker entries `shells:["worker"]` with `requiresEntity` gates so a cashier's device shows only counter nav.

### 12.6 Material & accessibility notes (ADR-011 applied, not recited)

- Glass by level: shell chrome and overlay sheets (W2, K2, B2 dialogs) may be translucent — persistent, hierarchical, temporary-context layers. **Solid, always:** K1/K3 queue cards (dense operational data), B2/B3 bill figures and anything printed, all forms, semantic state colours (StateBadge already enforces dot+label, never colour alone).
- Floor map (W1/M2 canvas): table nodes are solid controls over the atmosphere layer; state conveyed by category-coloured border + label + SR-readable text, never fill alone.
- Contrast: every accent-derived pair passes AA via `pairFor()`/`accentContrast()` — already tested for all ten presets in both themes; kitchen urgency badges use semantic colours, not accent, so a Rose-branded Kent's doesn't get pink critical alerts.
- Touch: 44px minimum targets throughout worker surfaces; one primary action per screen on phone (Bible V4 §1.A mobile law); viewport zoom never blocked.
- Reduced transparency / reduced motion honoured by the existing token remapping — no surface in this design introduces a new blur context beyond the four capped kinds.

### 12.7 Data freshness

No push infrastructure exists. V1 is **polled**: kitchen board 5s, floor map 10s, counter 15s, via lightweight `runQuery` revalidation (router.refresh on interval). Honest costs: a few hundred requests/hour/device against a single-tenant Postgres — trivial. SSE/WebSocket fan-out is the right later shape and lands in §17-D1 as a decision, not smuggled in.

---

## 13. Configuration & onboarding runbook

Ordered, each step naming its mechanism:

1. Provision tenant `Kent's Restaurant` (`timeZone: "Asia/Kolkata"`), Organization `Defence Colony`, Location + Place + Address. *(platform bootstrap)*
2. Install migration: capability tables + RLS + `capability_definition`/`entity_definition`/states/transitions seeds. Register in `registry.ts`. *(Location-exemplar pattern)*
3. `activateCapability(verity.capability.dinein)` — dependency validation runs; version pinned.
4. Seed ConfigParameters: CGST/SGST rates, inclusive/exclusive, service-charge toggle + rate, rounding rule, default prep-target minutes, GSTIN, FSSAI, currency=INR.
5. Seed roles (Owner, Manager, Waiter, Cook, Cashier) + permission matrix rows + RoleComposition edges; Owner's membership first.
6. Provision staff identities via `provisionIdentity()`; assign memberships + roles.
7. Declare CustomFieldSchema rows (veg, spice, jain_option on menu_item; shape on table).
8. Import menu: CSV via papaparse (already a dependency) through `create_menu_category`/`create_menu_item` commands — bulk import goes **through commands**, never direct SQL, so validation/audit/events hold.
9. Define zones + tables (`define_zone`, `define_table`), lay out floor in M2.
10. Seed notification templates (§11) + SlaPolicy row.
11. Business hours calendar; appearance preset choice; smoke test the §33-style chain: sign in as waiter → occupy → order → place → cook advances → cashier settles → verify event + activity + bill + vacated table.

Rollback story: suspend capability (`suspendCapability`, blocked while dependants active — none here), deactivate tenant activation; tables retain data, nothing platform-level changed.

---

## 14. Reports catalogue

| Report | Grain | Source |
|---|---|---|
| Daily sales summary | day × payment method | bills+payments (settled only) |
| Tax summary (GST filing aid) | day: taxable value, CGST, SGST | bill taxBreakdown |
| Item mix | item × qty × revenue, period | order_lines joined snapshot names |
| Table turnover | turns/day per table, avg seat-minutes | table transitions + order timestamps |
| Service speed | placement→serve p50/p90, breach count | sla_clocks + order events |
| Waiter activity | orders taken/served per staff | orders.takenByUserId |
| Void/discount ledger | who, when, how much | Activity stream filtered |

All server-rendered, date-range scoped, tenant-filtered by construction. No invented KPIs — every figure traces to a stored fact (Bible V4 §31 honesty rule).

---

## 15. Out of scope for v1 (each returns via the freeze's decision path when Kent's asks)

Reservations with time-slot booking (Resource/Booking path, §17-D9) · takeaway/delivery channels and external order ingestion · customer-facing menu/QR ordering · loyalty, feedback, CRM-grade guest profiles (future CRM capability) · inventory/recipe depletion/purchasing · payment gateway & card-terminal integration (GOV-SCO-006) · KOT printers as control path (kitchen reads screens; printing limited to guest bill) · multi-outlet consolidation reporting · split-by-item bills · tip handling · native apps (PWA only).

---

## 16. Foundation validation assessment

What building Kent's would prove, mapped to the foundation-ready definition:

- **New capability registers without touching infrastructure** — entities, commands, queries, states, permissions, events, schedules, navigation all arrive as capability data/code. PASS by construction of §6–§12; verified by the 31-point definition-of-done checklist + 8-point reusability test at merge time.
- **Reuse by the next client**: a second restaurant activates the same capability and configures menu/floor/taxes/staff — zero code fork. A non-restaurant tenant never sees it (activation-gated).
- **Cross-capability composition exercised**: Files (menu photos), Notifications (ready-pings), SLA (prep clocks), Scheduling substrate untouched-but-available (reservations later), Approval unused (correctly — nothing here needs a chain; forcing one would be ceremony).
- **Honest substrate exposure**: three deferred bindings (scheduler, storage driver, notification transport) become blocking for real features — the freeze predicted exactly this and §17 records each.

Known deviations / risks: DEC-001 reconciliation pending ADR (§2.2); polling-not-push accepted for v1 (§12.7); shared-device auth unresolved (§17-D7); no Work-order capability exists, so `verity.dinein.order` establishes the Work-pattern precedent itself rather than inheriting one — its state machines above should be reviewed against Bible V2's WORK primitive checklist during ratification.

---

## 17. Open decisions register (classified; none solved silently)

| # | Decision | Class | Recommendation |
|---|---|---|---|
| D1 | Realtime fan-out (SSE/WebSocket) vs polled refresh | Implementation decision required | Poll for v1; revisit at >10 concurrent devices or sub-second needs |
| D2 | Bind a schedule provider (runs `runDueWork`): SLA sweep, notification drain, day-rollup | Missing ADR + implementation decision — Kent's makes the requirement real | Smallest adapter on the deployment host; cadences already declared |
| D3 | Bind storage driver (menu/bill photos) | Implementation decision required | Defer: photos optional in v1; `uri` fallback exists |
| D4 | Notification transport dispatcher (InApp delivery marking exists; Email/Push unbound) | Implementation decision required | InApp polling suffices for v1 |
| D5 | Build Worker-Shell chrome or keep worker surfaces inside current adaptive shell law | Product/architectural decision | Keep current law for Kent's; revisit with the second deskless client |
| D6 | Money representation standard (integer minor units vs Decimal columns) platform-wide | Implementation decision required | Integer paise (used throughout this doc) |
| D7 | Shared-device staff switching (PIN-over-session) | **Security boundary — needs ADR before any build** | Not designed here; per-device personal sign-in until then |
| D8 | Wire offline command queue into worker devices (serwist SW + OfflineCommand replay) | Implementation decision; substrate PROVEN, UI unbuilt | Phase 2 after stable v1 |
| D9 | Reservations: promote tables to Resource+Asset with Booking slots | New platform-adjacent design, additive | Deferred until Kent's asks for booked slots |
| D10 | Membership/role administration UI (staff onboarding currently scripted) | Missing capability surface (platform-level) | Small admin pages under existing shell; not dinein-specific |
| D11 | Ratify ADR: DEC-001 scope reconciliation (§2.2) | **Missing ADR — blocks kitchen-surface build** | Text drafted in §2.2; owner sign-off required |
| D12 | Backwards/corrective edges (mis-tapped kitchen advance) | Implementation decision | Prefer manager-held corrective command over reverse transitions |

Per the stop-condition policy, work blocked on D7/D11 must wait for the owner; everything else proceeds unblocked.

---

## 18. Proposed build sequence

1. **Capability skeleton** — schema section, migration (tables, RLS, registry/seeds), `dinein/index.ts`, activation, empty contribution. Conformance tests green.
2. **Floor + Service core** — zones/tables CRUD, occupy/release commands, order/line machines, waiter surfaces W1–W5 against polled queries. Unit tests beside sources; integration in `src/test/` (tenancy, authorization-layers, state-runtime patterns already established).
3. **Kitchen** — K1–K3, advance command, SLA policy + urgency badges (sweep manual-trigger in dev until D2).
4. **Billing** — bill/payment/settle chain, tax engine fn, B1–B5 incl. print stylesheet.
5. **Manager pages + reports + notifications** — M1–M8, templates, workspace queues.
6. **Hardening** — conformance suite extension (forbidden-pattern grep clean, GOV-TER terms, RLS isolation tests for every new table), Playwright worker-surface specs (responsive + accessibility projects), onboarding runbook dry-run on fresh tenant.
7. Owner acceptance at Kent's: one dinner service on tablets, paper fallback retained night one.

Each phase ends releasable; none requires a platform edit — if one starts to, PLATFORM-FREEZE's three-question commit rule applies and work stops at §17 instead.

---

## 19. Traceability appendix

| Design element | Authority |
|---|---|
| Capability registration, activation gating, pinned versions | Spec PLA-CAP-001..004, PLA-VER-002..003 |
| Entities/keys/classes, tenant scoping exemptions | Spec MET-ENT-001..005 |
| Command pipeline order, exclusive write path | Spec MET-ACT-001..004 |
| State categories, labels, category-layer SLA | Spec MET-STA-001..004, ADR-009 |
| Structural transition guards, evidence guards | Spec MET-TRA-001..004 |
| Event outbox atomicity, immutability | Spec MET-EVE-001..002 |
| Custom fields end-to-end | Spec PLA-EXT-001..004 |
| Roles/composition/scopes/verbs | Spec PLA-AUT-001..005 |
| Tenant/Organization split, site modelling | ADR-005, ADR-004, Bible V2 LOCATION |
| Work-shaped execution, terminal decoupling | Bible V2 WORK, ADR-003 |
| Party restraint (no guest Parties) | ADR-001, ADR-007, INV-003 |
| Tables-not-Resources decision | ADR-008 (read: extension path, not obligation) |
| Money precedent | Bible V6 DEC-002 lineage (`pricePaise`) |
| Kitchen-screen positioning | Bible V6 DEC-001 (§2.2 reconciliation), PLATFORM-FREEZE decision path |
| Billing record-and-print boundary | GOV-SCO-006 |
| Materials, contrast, shells, density laws | ADR-011, Bible V4 §1–§5, implementation/08-experience/ |
| Terminology | GOV-TER-001..017 |
| Time zones, calendars | Bible V4 §5.B, EXE-SCH-001, temporal.ts |
| Everything marked EXISTING INFRASTRUCTURE | src/server/platform/* as built and proven at the 2026-08-24 gate |
