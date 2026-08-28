# Plywood trading — the six decisions, resolved

**Date:** 2026-08-28
**Status:** **RESOLVED 2026-08-28.** The product owner instructed the build to continue to
completion after the options in `implementation/plywood-gap-analysis.md` §4 were put to them with a
recommendation on each. **Option A was taken on all six.**

| | Decision | Outcome |
|---|---|---|
| **P1** | Stock costing | **Weighted average cost**, per product per godown |
| **P2** | Invoice numbering | **Counter row per series, locked inside the invoice transaction** |
| **P3** | Party balance | **Derived from the append-only ledger.** No cached balance column |
| **P4** | Place of supply | **Derived from state codes** on the tenant and the customer |
| **P5** | Reserved stock | **A reservation table.** Available = on hand − reserved |
| **P6** | Transporter access | **Records, not users, in v1.** No external portal |

The options that were not taken are left in the gap analysis, because they are the reason the ones
that were taken are defensible.

---

## What each decision commits the code to

### P1 — Weighted average cost

Each inward movement updates a running average for that product in that godown; each outward
movement consumes at the average standing at that moment and **records the consumed cost on the
ledger row**. Margin on a past sale is therefore a stored fact, not a recomputation that would drift
as later purchases changed the average.

The invariant: `stock_balance.qty_units` equals the sum of `stock_ledger.qty_delta_units` for that
product and godown. A test replays the ledger and asserts it, so the maintained balance cannot
silently diverge from the append-only truth it summarises.

**What this is not.** It is not FIFO, and the valuation screen says so. An owner reading a margin
figure is entitled to know which method produced it. FIFO remains introducible later per product
without invalidating history; guessing now and changing later would restate every past number.

### P2 — Counter row per series

`invoice_number_series` holds one row per series per financial year. The invoice command takes
`SELECT … FOR UPDATE` on it, increments, and uses the result **inside the same transaction as the
invoice**. A rollback returns the number.

This is chosen over a PostgreSQL sequence deliberately. Sequences are non-transactional by design,
so a rolled-back invoice burns its number and leaves a gap — and under GST a tax invoice series must
be sequential and gapless within a financial year. That is a legal constraint, not a preference, and
it is the only test that matters here. The cost is that invoice creation serialises per series; at
this business's volume that is nothing.

### P3 — Balance derived, never cached

`Customer` and `Supplier` carry **no** `outstandingBalancePaise` column, and `party_ledger_entry`
carries no running balance. A balance is `SUM(debit) − SUM(credit)` over the party's entries, taken
at read time and indexed.

`plywood.md` §6 originally proposed three places for one fact. Two of them are removed rather than
kept in sync: when a cached balance and a ledger disagree — and eventually they do — nobody can say
which is right. A materialised view is the answer if a real query proves too slow, and adding one
before there is a measurement is how the drift gets in.

### P4 — Place of supply from state codes

The tenant carries a state code in configuration; each customer carries one on their record. The
invoice command compares them: same state is CGST + SGST, different state is IGST. The rule lives in
one function and is visible.

**This tax logic is not shared with Kent's.** Different rules, capability-private both times. Two
private functions is the correct amount of duplication here; merging them is how a "generic tax
engine" gets born.

### P5 — A reservation table

A reservation is not a movement — nothing leaves the godown — so it does not belong in an append-only
movement ledger, and it is not modelled as a pseudo-godown, which would make rack reporting and
physical stock counts wrong.

`stock_reservation` records product, godown, quantity and the sales order it is held for, and is
released on dispatch or cancellation. **Available = on hand − active reservations.**

**Sequencing note.** The gap analysis listed P5 against stage 2. It is built in **stage 4**, with
sales orders, because a reservation is held *for an order* and the typed foreign key has nothing to
point at until that table exists. Building it a stage early would have required either a polymorphic
reference — the exact defect §3.2 corrected — or a nullable column with no referent. Stage 2 ships
the ledger, the balance and valuation; stage 4 adds reservation and the availability query.

### P6 — Transporters are records

A transporter is a row with a name, a phone number and their vehicles. The logistics coordinator
updates transit status, which is how the business runs today: a phone call becomes a status update.

No transporter logs in. A non-staff party seeing tenant data is an external-facing surface — a
different shell, an invitation flow, and a scoping decision about what they may see. That is an ADR
and a security boundary, not a feature, and it is revisited when a transporter actually asks.

---

## What none of these decisions authorised

No platform change. `git diff --stat src/server/platform/` is expected to stay empty for every
plywood stage, and if any stage begins to need an edit there, PLATFORM-FREEZE's three-question rule
applies and the work stops rather than continuing.

No generic financial ledger, no shared tax engine, no warehouse abstraction, no trading pack.
