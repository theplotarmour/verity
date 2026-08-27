# Plywood trading — requirement → contract → gap, and the build plan

**Date:** 2026-08-28
**Requirement source:** `plywood.md` (client requirements as received, §1). Nothing below is invented.
**Status:** **ANALYSIS AND PLAN. No code written.** Six decisions are put to the product owner as
options; none is chosen here, and nothing that depends on one begins before it is answered.
**Second client.** Kent's was the first, and the reuse this one gets is measured in §2 rather than
assumed.

---

## 1. Requirement → contract → gap

| # | Requirement (§1) | Existing contract that carries it | Gap |
|---|---|---|---|
| 1 | Product master — brand, thickness, size, grade, unit count | Capability-owned tables; custom fields for tenant-specific attributes (PLA-EXT-002) | **None.** Capability code |
| 1 | Stock by godown, inward/outward, transfers, adjustments | Capability-owned append-only ledger; `Location` for godowns | **None** for the ledger. **P5** for reserved stock |
| 1 | Low-stock alerts | Notification substrate + `ScheduleContribution` + the trigger bound by ADR-015 | **None.** Inherited whole from Kent's |
| 1 | Stock valuation | Ledger rows carry unit cost | **P1 — no costing method is decided.** FIFO, weighted average and last-cost give materially different numbers |
| 2 | Supplier master, supplier pricing | Capability-owned tables | **None** |
| 2 | Purchase orders, invoices, goods received | Command runtime, state runtime | **None.** Order lines must be a TABLE — see §3 |
| 2 | Supplier outstanding, supplier ledger | Capability-owned append-only ledger | **P3 — where the balance lives** |
| 3 | Customer master, quotations, sales orders | Command runtime, state runtime | **None** |
| 3 | Price lists, customer-specific pricing | Capability-owned tables | **None** |
| 3 | Credit limits | Command precondition (MET-ACT-003) | **None.** Must be a precondition, not a UI check |
| 4 | Sales/purchase invoices, receivables, payables | Capability-owned tables | **None** |
| 4 | Customer and supplier ledgers | Append-only tables + the trigger pattern already used for `activity`, `security_audit_event` and `domain_event` | **None.** Pattern proven three times |
| 4 | Payment collection and entries | Capability-owned tables | **None** |
| 4 | GST-ready invoice data | Capability-owned columns, rates from `ConfigParameter` | **P4 — place-of-supply rule** decides CGST+SGST versus IGST |
| 4 | Profit / margin tracking | Sale price minus consumed cost | **Blocked on P1.** Margin is undefined until costing is |
| 5 | Professional GST invoices, delivery challans | Server-rendered print route, as Kent's bill does | **HSN code missing from the product model** — legally required on the invoice |
| 5 | Invoice numbering | — | **P2 — nothing exists.** Sequential and gapless per series per financial year is a legal constraint |
| 5 | PDF / print / share | Print stylesheet; `StoredFile` for retained copies | **Storage driver unbound.** Print works without it; retaining PDFs does not |
| 6 | Purchase → supplier → transport → godown → customer | Capability-owned `Shipment` with its own state machine | **None** |
| 6 | Transporter master, vehicle details | Capability-owned `Transporter`; `Asset` for vehicles | **None.** First real reuse of `Asset` |
| 6 | LR documents, delivery confirmation | `Evidence` — checksum-frozen, immutable | **Storage driver unbound**, as above |
| 6 | Freight charges and who pays | Columns on `Shipment` | **None** |
| 6 | "Where is my material right now?" | A query over shipment state + timestamps | **None** |
| 7 | Multiple godowns, rack-level tracking | `Location` primitive + capability-owned rack table | **None** |
| 7 | Reserved stock | — | **P5 — a reservation is not a movement.** No model |
| 8 | Owner dashboard with drill-down | Server components, chart primitives, workspace contributions | **None** |

**Conclusion: no platform change is required.** Every gap is either capability code, an unbound
provider that was always going to wait for a requirement, or one of the six decisions below.

---

## 2. What the second client actually reuses

This is the measurement Kent's could not provide, because Kent's was first.

| Layer | Reused | Evidence |
|---|---|---|
| **Platform** | Everything | Tenancy, auth, roles, commands, queries, state, events, audit, SLA, config, notifications, HQ. Expected diff on `src/server/platform/`: **empty** |
| **Shared capabilities** | `Location`, `Asset`, `Evidence` | Godowns are Locations, vehicles are Assets, LR scans and signed receipts are Evidence. Three capabilities built to prove the foundation, used by a real client without modification |
| **Bound providers** | The ADR-015 scheduler trigger | Low-stock sweeps declare a cadence and run. Kent's paid for that binding; plywood gets it free — which is what "the first requirement forces the binding" was supposed to mean |
| **Kent's capability** | **Nothing** | No dine-in table, command or query is touched. Correct: a plywood godown is not a restaurant table |
| **Kent's patterns** | Several | Snapshot name and price onto the line; rates in config and arithmetic in code; integer minor units; the chain closing itself; append-only records that adjust forward rather than edit |

That last row is the compounding. Plywood is a bigger domain than Kent's and should take less
argument per entity, because the shapes are settled.

---

## 3. Corrections `plywood.md` needs before any code

Each is a defect in the design document, not a decision.

### 3.1 `items Json` must become tables — blocking

`SalesOrder.items` and `PurchaseOrder.items` (§6 M3, M4) fail the over-genericity conformance check,
which permits `Json` only at declared extension points. That check is not ceremony: `qtyOrdered`
versus `qtyReceived` per line is exactly what partial receipts and partial dispatch turn on, and in
JSON "what is still owed on PO-4471" cannot be answered without loading every purchase order.

`Bill.taxBreakdown` was the same mistake, caught by the same test, two commits ago.

**Required:** `purchase_order_line` and `sales_order_line` tables, each snapshotting product name and
unit price, each carrying its own ordered/received/shipped quantities.

### 3.2 Polymorphic references should be typed

`refEntityKey` + `refEntityId` appears on `StockLedger`, `Shipment` and `Invoice`. It carries no
foreign key, so nothing prevents an orphan pointing at a deleted order.

**Required:** nullable typed columns — `salesOrderId`, `purchaseOrderId` — with a check constraint
that exactly one is set. Same expressiveness, real referential integrity.

### 3.3 HSN code on `Product`

Legally required on a GST invoice. One column, currently absent.

### 3.4 "Maps to the Work primitive" is not true yet

§2.1 and §2.3 describe `SalesOrder`, `PurchaseOrder` and `Shipment` as mapping to a `Work` primitive.
No Work capability exists. They are capability-owned entities with their own state machines, which is
fine and is what Kent's `DiningOrder` also is. The wording should say so, or a reader will look for
a reuse that is not there.

### 3.5 Append-only must be a trigger, not a convention

The document says the ledgers are append-only. `activity`, `security_audit_event` and `domain_event`
each enforce that with a database trigger. A ledger that is append-only only because no code writes
an UPDATE is append-only until someone writes one.

---

## 4. Open decisions — options, not choices

### P1 — Stock costing method

**Requirement:** §1.1 "stock valuation"; §1.4 "profit/margin tracking". Both are undefined until
this is answered, and margin is the number the owner will judge the system by.

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **Weighted average cost.** Each inward movement updates a running average; a sale consumes at that average | One number per product per godown. Simple to explain, cheap to compute, stable against price swings | Does not match physical reality when the same board is bought at very different prices; the profit on any single sale is an average, not that sale's actual margin |
| **B** | **FIFO.** A sale consumes the oldest remaining cost layers | Matches how stock physically moves and how most accountants expect it. Per-sale margin is real | Needs cost layers and a consumption algorithm; adjustments and returns have to unwind layers correctly. Materially more code |
| **C** | **Last purchase cost.** Value at the most recent purchase price | Trivial | Not a costing method so much as an estimate. Reported profit moves when a purchase happens rather than when a sale does |

**ADR required:** No, but it must be written down in the capability and shown on the valuation
screen. An owner reading a margin figure is entitled to know which of these produced it.

**Recommendation:** **A** for v1. It answers "what is my stock worth" and "roughly what did I make"
honestly, and B can be introduced later per product without invalidating history — whereas guessing
now and changing later restates every past number.

### P2 — Invoice numbering

**Requirement:** §1.5. Under GST, a tax invoice series must be **sequential and gapless** within a
financial year. This is a legal constraint, not a preference.

The hard part is concurrency: two cashiers raising invoices at once must not receive the same number,
and a transaction that rolls back must not consume one — which is exactly what a PostgreSQL sequence
does, because sequences are deliberately non-transactional.

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **Counter row per series, locked in the invoice transaction.** `SELECT … FOR UPDATE`, increment, use | Genuinely gapless: a rollback returns the number. Simple to reason about | Serialises invoice creation per series. At this business's volume that is nothing; at thousands per minute it would be a queue |
| **B** | **PostgreSQL sequence** | No contention | **Leaves gaps.** A rolled-back transaction burns its number, and the client would have to explain the missing invoice to a tax officer |
| **C** | **Number at settlement rather than at draft** | Fewer wasted numbers | Does not solve gaplessness; only reduces how often it bites |

**ADR required:** No. It is an implementation decision with a legal constraint attached, and the
constraint decides it.

**Recommendation:** **A.** Gapless is the requirement, contention is not a real problem here, and B
fails the only test that matters.

### P3 — Where a party's balance lives

**Requirement:** §1.2 supplier outstanding, §1.3 customer outstanding, §1.4 ledgers.

`plywood.md` currently has `Customer.outstandingBalancePaise`, `Supplier.outstandingBalancePaise`
**and** `FinanceLedger.runningBalancePaise` — three places for one fact, beside an append-only ledger.

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **Ledger is the only truth; balance is derived** | Cannot drift. Every balance is provably the sum of its entries | A sum per party on every read. Trivial at this scale, and indexable |
| **B** | **Ledger plus a maintained running balance on each entry**, written in the same transaction under a per-party lock | Reading the latest entry gives the balance and the history in one row | The lock is load-bearing and easy to lose in a later refactor. Correct only while every writer honours it |
| **C** | **Cached balance on the party row**, recomputed by the same transaction | Fastest read | Two sources of truth. When they disagree — and eventually they do — nobody can say which is right |

**ADR required:** No, but whichever is chosen must be stated with its invariant.

**Recommendation:** **A**, with a materialised view or cached column added only if a real query
proves too slow. A denormalised balance is an optimisation; adding it before there is a measurement
is how the drift gets in.

### P4 — Place of supply: CGST+SGST versus IGST

**Requirement:** §6 M6 stores all three. Which pair applies depends on whether the supply is
intra-state or inter-state, which is decided by the supplier's state and the customer's place of
supply.

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **Derive from state codes.** Store the tenant's state and each customer's state; the invoice command picks the pair | Correct by construction, and the rule is visible in one function | Needs a state code on the customer master and on tenant configuration |
| **B** | **Ask at invoice time** | No new fields | Puts a tax classification in the hands of whoever is raising the invoice, every time. Errors are silent and appear in a filing |
| **C** | **Configure a single default** | Trivial | Wrong the first time the business sells across a border, which for a Delhi trader is immediately |

**ADR required:** No.

**Recommendation:** **A.** Also note: this tax logic must **not** be shared with Kent's. Different
rules, capability-private both times. Merging them is how a "generic tax engine" gets born.

### P5 — Reserved stock

**Requirement:** §1.7 lists reserved stock as a first-class godown concern.

A reservation is not a movement — nothing leaves the godown — so it does not belong in an append-only
movement ledger.

| | Option | What it means | Cost |
|---|---|---|---|
| **A** | **A reservation table**: product, godown, quantity, the order it is held for, released on dispatch or cancellation. Available = on-hand − reserved | Explicit, queryable, releasable. "Why can I not sell these 40 sheets" has an answer with a name on it | One more table and the discipline of releasing them |
| **B** | **Reserve by moving stock to a "reserved" pseudo-godown** | Reuses the ledger | A location that is not a place. Rack-level reporting and physical stock counts both become wrong |
| **C** | **Do not reserve in v1.** Allocation happens at dispatch | Nothing to build | Two sales representatives can promise the same stock, which is the problem reservation exists to prevent |

**ADR required:** No.

**Recommendation:** **A.**

### P6 — Transporter access

`plywood.md` §2.1 suggests transporters may link to `Party` records "when logins are required".

A transporter logging in is an **external-facing surface** — a different shell, a different
authentication story, and a party who is not staff seeing tenant data. None of that exists.

| | Option | Cost |
|---|---|---|
| **A** | **Transporters are records, not users, in v1.** The logistics coordinator updates transit status | Nothing to build. A phone call becomes a status update, which is how it works today |
| **B** | **Transporter portal** | An external shell, an invitation flow, and a scoping decision about what a non-staff party may see. That is an ADR and a security boundary, not a feature |

**ADR required:** **Yes, if B.** Not if A.

**Recommendation:** **A** for v1. Revisit when a transporter actually asks.

---

## 5. Platform impact

Assessed honestly, candidate by candidate. **Expected `git diff --stat src/server/platform/`: empty.**

| Candidate | Needs platform change? | Why not |
|---|---|---|
| Append-only ledger triggers | No | Capability migration, following the pattern `audit_streams` already uses three times |
| Gapless invoice numbering | No | A capability-owned counter table and a command |
| Stock costing | No | Capability code |
| Low-stock sweep | No | `ScheduleContribution` and the ADR-015 trigger, both existing |
| Godowns, vehicles, documents | No | `Location`, `Asset`, `Evidence` as they stand |
| Dashboard aggregates | No | Registered queries |
| Storage driver for PDFs and LR scans | **A binding, not a change** | The contract is complete and unbound. Plywood is the first requirement that genuinely needs a file to persist — that makes binding one legitimate, and it is its own decision when the module that needs it is reached |

If anything in the build starts to need a platform edit, PLATFORM-FREEZE's three-question rule
applies and work stops here rather than continuing.

---

## 6. Build sequence

Each stage ends releasable, has its own tests, and touches no platform file.

| # | Stage | Contents | Blocked by |
|---|---|---|---|
| **1** | **Catalogue and floor** | Brand, Product (with HSN), godown racks over `Location`. Menu-equivalent: the thing everything else references | — |
| **2** | **Stock ledger** | Append-only movements with a trigger, inward/outward/transfer/adjust commands, on-hand and valuation queries, low-stock threshold | **P1** (valuation), **P5** (reserved) |
| **3** | **Purchase** | Supplier, supplier pricing, purchase order + lines, goods received writing stock inward | Stage 2 |
| **4** | **Sales** | Customer, customer pricing, credit limit as a precondition, sales order + lines, allocation | Stage 2 |
| **5** | **Logistics** | Transporter, Shipment over `Asset` and `Evidence`, dispatch and delivery commands, the "where is my material" query | Stages 3 and 4 |
| **6** | **Finance** | Invoice with numbering, tax by place of supply, payments, append-only party ledger, outstanding | **P2**, **P3**, **P4**. Last on purpose: it depends on stock, sales and purchase all being real |
| **7** | **Dashboard and reports** | Owner KPIs with drill-down, margin, day and month reports | Stages 2–6 |
| **8** | **Hardening** | Conformance extension, isolation tests per new table, a service-chain fixture — purchase → godown → sale → shipment → delivery → invoice → payment → report — that builds a temporary tenant and destroys it | All |

Stage 8's fixture is the plywood equivalent of `kents-service-chain.test.ts`: a **fixture, never seed
data**. No demo trading business exists in the application.

---

## 7. Definition of done

Per stage: typecheck clean · lint clean · full suite green with **0 skipped** · build green ·
`git diff --stat src/server/platform/ prisma/schema.prisma` shows **only additive capability
models** · no forbidden pattern · canonical terminology · every new table RLS-enabled with an
isolation test.

At the end: the eight-step service-chain fixture passes, and the owner's four questions have
screens that answer them — *where is my material, what have I sent and was it delivered, what am I
owed, what did I make*.

---

## 8. What must not be built

- A **generic financial ledger** or double-entry engine in the platform. Capability-private tables,
  as `plywood.md` §2.2 already says.
- A **shared tax engine** across Kent's and plywood. Different rules; two capability-private
  functions is the correct amount of duplication.
- A **generic warehouse abstraction**, inventory framework, or "trading pack". One capability.
- **Barcode, GPS, e-way bill API, payment gateway** — each is out of scope by §1, and each returns
  through the decision path if the client asks.
- A **second restaurant's worth of reuse pressure**: nothing in dine-in should be generalised to
  serve plywood, and nothing here should be built "so Kent's could use it too".
