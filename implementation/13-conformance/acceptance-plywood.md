# Acceptance script — Plywood trading (`verity.capability.plywood`)

Authority: `taskplans/85_foundation_conformance_acceptance_script.md`. Written
retrospectively 2026-09-04 against the capability already shipped across
Tasks 47–71 — the first instance of this template, not a design document for
new work. Certifies the capability end to end, from an empty tenant to a
completed sale with its audit trail, "without leaving the product model"
(the taskplan's own words: no direct DB row edits at any step).

**Not a replacement for the vitest/Playwright suites** — this is a
human-readable, re-runnable checklist a person (or an agent) can walk by
hand, in the product, and confirm the capability actually does what it
claims. Passing this and passing the automated suite are two different
kinds of evidence.

## Prerequisite

A fresh tenant with the plywood capability activated, an owner-role actor,
no existing brands/products/parties. `npm run seed:plywood` sets this up for
local verification; the script below assumes that fixture or an equivalent
fresh workspace.

## 1. Create workspace

- [ ] Tenant exists, plywood capability shows **Active** on `/capabilities`.
- [ ] Signed-in owner sees the plywood navigation (`Catalogue`, `Suppliers`,
      `Purchases`, `Customers`, `Sales`, `Stock`, `Godowns`, `Finance`,
      `Transactions`, `Who owes what`, `Reports`, `Tax & Compliance`).

## 2. Configure defaults

- [ ] `/settings/business` — business profile (name, GSTIN) savable.
- [ ] `/settings/tax` — at least one GST registration + tax rule exists or is
      creatable.
- [ ] A godown (`Location`) exists with at least one rack (`/godowns`).

## 3. Create first master records

- [ ] **Item**: create a brand (`createBrand`), then a product under it
      (`createProduct`) with an HSN code and thickness — appears in
      `/catalogue`.
- [ ] **Supplier**: `createSupplier` — appears in `/suppliers`, agreed price
      settable via `setSupplierPrice`.
- [ ] **Customer**: `createCustomer` — appears in `/customers`, credit limit
      settable via `setCreditLimit`.

## 4. Perform a first transaction

- [ ] Raise a purchase order (`createPurchaseOrder` → `submitPurchaseOrder`)
      against the supplier for the product created above.
- [ ] Receive it (`receiveGoods`) into the godown rack — stock ledger shows
      the receipt (`stockLedger` query / `/stock`), stock balance increases
      (`stockOnHand`).
- [ ] Confirm the automatic purchase bill was raised
      (`issueProvisionalPurchaseBill`, triggered by `receiveGoods`) — visible
      on `/finance`, not a manual step.
- [ ] Raise a sales order (`createSalesOrder`) against the customer, approve
      credit if held (`approveCredit`), reserve stock (`reserveForOrder`),
      dispatch (`dispatchOrder`) — stock ledger shows the issue, balance
      decreases.
- [ ] Raise the sales invoice (`raiseSalesInvoice`).

## 5. Complete it

- [ ] Record a customer payment (`recordPartyPayment`) against the sales
      invoice — FIFO-allocated, visible on `/transactions`.
- [ ] `partyBalances` / `/ledgers` shows the customer's balance net of the
      payment.
- [ ] `outstandingReceivables` no longer lists the paid invoice (or lists it
      at zero).

## 6. View the resulting report

- [ ] `/reports` — margin report (`marginReport`) reflects the transaction's
      cost and sale price.
- [ ] `ownerConsole` (dashboard) reflects updated stock/receivables figures
      with no manual refresh step needed beyond navigation.

## 7. Verify the audit trail

- [ ] `/audit` shows every command executed above (brand/product/supplier/
      customer creation, PO submit, goods receipt, sales order, dispatch,
      invoice, payment) with actor, timestamp, and correlation id — none
      missing, none out of order.
- [ ] No step above required a direct database edit, a manual balance
      correction, or a support-only code path — everything ran through the
      product's own commands and queries.

## Result

**PASS** as of 2026-09-04, walked against the plywood capability's actual
shipped command/query set (Tasks 47–71). Certifies the capability, not any
one tenant's data — re-run this script (not spot-check production data) the
next time plywood's lifecycle changes materially.
