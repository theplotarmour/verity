# Coverage — 2026-09-07 run

**Read this before reading a tick.** This run was **read-only by instruction**: no command was
executed, no form was submitted, no row was written. So *no command key in this list was
exercised*, and saying otherwise would be the fake green tick the brief warns about.

What was exercised: the read path. 47 routes were loaded as each of six identities plus
anonymously (329 page loads), which drives the queries those pages call. Everything else is
marked untested with the reason.

## Status vocabulary

| Mark | Meaning |
|---|---|
| `[r]` | **Read path exercised** — a page that calls this query rendered (or failed) during the sweep, under a real actor |
| `[f]` | **Exercised and failed** — see the finding named |
| `[s]` | **Source-reviewed only** — the definition was read; behaviour not observed |
| `[ ]` | **Untested**, with the reason beside it |

## Routes

47 routes swept as each of six identities plus anonymously — **329 page loads**. Failures per identity:

| Identity | Failing routes | Of which capability-inactive (F-009) | Genuine failures (F-001/F-002) |
|---|---|---|---|
| `operator` (platform tenant, no trading/dinein) | **30** | 30 | 0 |
| `ownerA` (tenant A, 12 customers) | 12 | 4 | **8** — `/workspace`, `/sales`, `/customers`, `/prices`, `/ledgers`, `/transactions`, `/evidence`, `/configuration` |
| `managerA` (tenant A, Organization scope) | 8 | 5 | **3** — `/`, `/customers`, `/prices` |
| `ownerB` (tenant B, 3 customers) | 7 | 5 | **2** — `/workspace`, `/evidence`, `/configuration` |
| `staffB` (tenant B, narrow counter role) | 6 | 5 | **1** — `/` |
| `rolelessB` (tenant B, no role) | 5 | 5 | 0 |
| `anon` | 0 | — | — |

Signed out, **all 47 routes redirect to `/sign-in` and return no content** — identical 696-character
body on every one, no exceptions, nothing leaked. As every non-operator identity, all four `/hq*`
routes redirect to `/`.

The `ownerA` versus `ownerB` row is the controlled comparison behind F-002: same code, same
server, same pool, four times the customers, five more broken screens.

**Routes never reached at all:** the id-bearing detail routes were not driven this run —
`/catalogue/[productId]`, `/stock/[productId]`, `/godowns/[locationId]`,
`/purchases/[orderId]`, `/sales/[orderId]`, `/customers/[customerId]`,
`/suppliers/[supplierId]`, `/finance/[invoiceId]`, `/assets/[id]`, `/locations/[id]`,
`/counter/[billId]`, `/floor/[orderId]`, `/hq/clients/[tenantId]` and its six sub-pages.

**Console:** 2 errors across all 329 loads, both the same 500-resource message from F-001. No
hydration mismatch, no React warnings.

## APIs

| Route | Result |
|---|---|
| `/api/health` | `[r]` 200, `{"status":"ok"}`, no auth required (by design, and it makes no external call) |
| `/api/ready` | `[ ]` not called this run |
| `/api/metrics` | `[r]` 200 in development; secret-gated in production, `timingSafeEqual`. Counters were **empty after 14 h of uptime** — see F-010 |
| `/api/scheduled` | `[r]` 401 unauthenticated. **Not run authenticated** — it performs work, and this audit was read-only |
| `/api/agent/chat` | `[r]` 401 unauthenticated. **Not run authenticated** — it spends provider budget and can execute commands |

## Command and query keys


### accounting — 7

**Capability not activated in either audited tenant.** Every key below is untested for that reason; the surfaces that would reach them (`/counter`, `/floor`, `/kitchen`, `/menu` for dine-in) return an unhandled 500 rather than a refusal — F-009.

- [ ] `verity.accounting.account_ledger` (query) — capability inactive in both audited tenants
- [ ] `verity.accounting.create_account` (command) — capability inactive in both audited tenants
- [ ] `verity.accounting.list_accounts` (query) — capability inactive in both audited tenants
- [ ] `verity.accounting.post_journal_entry` (command) — capability inactive in both audited tenants
- [ ] `verity.accounting.reverse_journal_entry` (command) — capability inactive in both audited tenants
- [ ] `verity.accounting.set_account_active` (command) — capability inactive in both audited tenants
- [ ] `verity.accounting.trial_balance` (query) — capability inactive in both audited tenants

### approval — 3

- [s] `verity.approval.decide` (command) — definition read; **not executed** (read-only run)
- [r] `verity.approval.list_pending` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.approval.request` (command) — definition read; **not executed** (read-only run)

### asset — 4

- [s] `verity.asset.change_state` (command) — definition read; **not executed** (read-only run)
- [r] `verity.asset.list` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.asset.register` (command) — definition read; **not executed** (read-only run)
- [s] `verity.asset.relocate` (command) — definition read; **not executed** (read-only run)

### billing — 7

**Capability not activated in either audited tenant.** Every key below is untested for that reason; the surfaces that would reach them (`/counter`, `/floor`, `/kitchen`, `/menu` for dine-in) return an unhandled 500 rather than a refusal — F-009.

- [ ] `verity.billing.create_meter` (command) — capability inactive in both audited tenants
- [ ] `verity.billing.generate_invoice_for_meter` (command) — capability inactive in both audited tenants
- [ ] `verity.billing.list_meters` (query) — capability inactive in both audited tenants
- [ ] `verity.billing.open_billing_period` (command) — capability inactive in both audited tenants
- [ ] `verity.billing.period_invoices` (query) — capability inactive in both audited tenants
- [ ] `verity.billing.record_meter_reading` (command) — capability inactive in both audited tenants
- [ ] `verity.billing.set_meter_rate` (command) — capability inactive in both audited tenants

### dinein — 30

**Capability not activated in either audited tenant.** Every key below is untested for that reason; the surfaces that would reach them (`/counter`, `/floor`, `/kitchen`, `/menu` for dine-in) return an unhandled 500 rather than a refusal — F-009.

- [ ] `verity.dinein.add_order_lines` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.advance_order_line` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.apply_bill_discount` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.cancel_order` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.create_menu_category` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.create_menu_item` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.create_menu_variant` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.create_order` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.define_table` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.define_zone` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.edit_menu_item` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.generate_bill` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.get_bill_detail` (query) — capability inactive in both audited tenants
- [ ] `verity.dinein.get_order_detail` (query) — capability inactive in both audited tenants
- [ ] `verity.dinein.item_ready` (notification) — capability inactive in both audited tenants
- [ ] `verity.dinein.kitchen_queue` (query) — capability inactive in both audited tenants
- [ ] `verity.dinein.list_floor` (query) — capability inactive in both audited tenants
- [ ] `verity.dinein.list_menu` (query) — capability inactive in both audited tenants
- [ ] `verity.dinein.list_open_bills` (query) — capability inactive in both audited tenants
- [ ] `verity.dinein.move_table` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.open_bills` (workspace queue) — capability inactive in both audited tenants
- [ ] `verity.dinein.place_order` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.position_table` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.record_payment` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.sales_summary` (query) — capability inactive in both audited tenants
- [ ] `verity.dinein.set_menu_item_active` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.settle_bill` (command) — capability inactive in both audited tenants
- [ ] `verity.dinein.sweep_prep_breaches` (schedule) — capability inactive in both audited tenants
- [ ] `verity.dinein.tables_to_clean` (workspace queue) — capability inactive in both audited tenants
- [ ] `verity.dinein.void_order_line` (command) — capability inactive in both audited tenants

### evidence — 2

- [s] `verity.evidence.capture` (command) — definition read; **not executed** (read-only run)
- [r] `verity.evidence.list_for` (query) — reached through the route sweep where a page calls it; not asserted row-by-row

### hr — 8

**Capability not activated in either audited tenant.** Every key below is untested for that reason; the surfaces that would reach them (`/counter`, `/floor`, `/kitchen`, `/menu` for dine-in) return an unhandled 500 rather than a refusal — F-009.

- [ ] `verity.hr.apply_for_leave` (command) — capability inactive in both audited tenants
- [ ] `verity.hr.create_department` (command) — capability inactive in both audited tenants
- [ ] `verity.hr.create_employee` (command) — capability inactive in both audited tenants
- [ ] `verity.hr.create_leave_type` (command) — capability inactive in both audited tenants
- [ ] `verity.hr.decide_leave_application` (command) — capability inactive in both audited tenants
- [ ] `verity.hr.leave_application_status` (query) — capability inactive in both audited tenants
- [ ] `verity.hr.list_employees` (query) — capability inactive in both audited tenants
- [ ] `verity.hr.set_employee_active` (command) — capability inactive in both audited tenants

### inventory — 7

**Capability not activated in either audited tenant.** Every key below is untested for that reason; the surfaces that would reach them (`/counter`, `/floor`, `/kitchen`, `/menu` for dine-in) return an unhandled 500 rather than a refusal — F-009.

- [ ] `verity.inventory.create_item_group` (command) — capability inactive in both audited tenants
- [ ] `verity.inventory.create_item` (command) — capability inactive in both audited tenants
- [ ] `verity.inventory.list_items` (query) — capability inactive in both audited tenants
- [ ] `verity.inventory.record_stock_movement` (command) — capability inactive in both audited tenants
- [ ] `verity.inventory.set_item_active` (command) — capability inactive in both audited tenants
- [ ] `verity.inventory.stock_ledger` (query) — capability inactive in both audited tenants
- [ ] `verity.inventory.stock_on_hand` (query) — capability inactive in both audited tenants

### location — 8

- [s] `verity.location.add_geofence` (command) — definition read; **not executed** (read-only run)
- [s] `verity.location.assign_user` (command) — definition read; **not executed** (read-only run)
- [s] `verity.location.create_location` (command) — definition read; **not executed** (read-only run)
- [s] `verity.location.create_place` (command) — definition read; **not executed** (read-only run)
- [s] `verity.location.edit_location` (command) — definition read; **not executed** (read-only run)
- [r] `verity.location.list_locations` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.location.remove_location` (command) — definition read; **not executed** (read-only run)
- [s] `verity.location.set_custom_fields` (command) — definition read; **not executed** (read-only run)

### platform — 19

- [s] `verity.platform.assign_role` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.compose_role` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.create_organization` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.create_role` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.grant_permission` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.invite_person` (command) — definition read; **not executed** (read-only run)
- [r] `verity.platform.list_configuration` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.platform.list_grantable_entities` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.platform.list_modules` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.platform.list_organizations` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.platform.list_people` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.platform.list_roles` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.platform.operations_snapshot` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.platform.revoke_membership` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.revoke_permission` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.set_capability_state` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.set_configuration` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.set_person_state` (command) — definition read; **not executed** (read-only run)
- [s] `verity.platform.update_organization` (command) — definition read; **not executed** (read-only run)

### plywood — 9

- [ ] `verity.plywood.capture_metric_snapshot` (schedule) — no read-only path reaches it; schedules and notifications were not fired
- [s] `verity.plywood.create_product` (command) — definition read; **not executed** (read-only run)
- [s] `verity.plywood.edit_product` (command) — definition read; **not executed** (read-only run)
- [r] `verity.plywood.list_catalogue` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [ ] `verity.plywood.low_stock` (workspace queue + notification) — no read-only path reaches it; schedules and notifications were not fired
- [r] `verity.plywood.product_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.plywood.set_product_active` (command) — definition read; **not executed** (read-only run)
- [r] `verity.plywood.stock_on_hand` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [ ] `verity.plywood.sweep_low_stock` (schedule) — no read-only path reaches it; schedules and notifications were not fired

### scheduling — 5

- [s] `verity.scheduling.book` (command) — definition read; **not executed** (read-only run)
- [s] `verity.scheduling.create_group` (command) — definition read; **not executed** (read-only run)
- [s] `verity.scheduling.create_resource` (command) — definition read; **not executed** (read-only run)
- [s] `verity.scheduling.declare_unavailable` (command) — definition read; **not executed** (read-only run)
- [r] `verity.scheduling.list_bookings` (query) — reached through the route sweep where a page calls it; not asserted row-by-row

### trading — 97

- [s] `verity.trading.adjust_stock` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.allocation_plan` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.approve_credit` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.business_settings` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.cancel_purchase_order` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.cancel_sales_order` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.close_checklist` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.close_period` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.confirm_purchase_bill` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.create_brand` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.create_customer` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.create_purchase_order` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.create_sales_order` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.create_supplier` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.customer_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.customer_prices` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.define_godown_rack` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.dispatch_order` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.edit_customer` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.edit_purchase_order` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.edit_sales_order` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.edit_supplier` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.finance_ageing` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.godown_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.goods_receipt_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.gstr1_working` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.gstr3b_working` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.import_gst_portal_records` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.inventory_analysis` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.invoice_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.issue_stock` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.itc_reconciliation` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.link_supplier_to_customer` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.list_business_activities` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.list_customers` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.list_godown_racks` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.list_invoices` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.list_suppliers` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.low_stock` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.margin_report` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.metrics_history` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.needs_attention` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.onboarding_checklist` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.open_orders` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.outstanding_receivables` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.owner_console` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.party_balances` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.party_ledger` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.payment_journal` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.product_movements` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.product_tax_rates` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.purchase_analysis` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.purchase_match` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.purchase_order_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.purchase_review_queue` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.raise_invoice_note` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.raise_purchase_bill_from_order` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.raise_purchase_invoice` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.raise_sales_invoice` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.receive_goods` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.receive_stock` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.recent_activity_feed` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.record_damaged_stock` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.record_party_payment` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.record_payment` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.record_returned_stock` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.register_gst_registration` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.remove_customer` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.remove_supplier` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.reopen_period` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.reserve_for_order` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.sales_analysis` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.sales_order_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.sellable_stock` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.set_brand_active` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_business_profile` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_credit_limit` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_customer_price` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_godown_rack_active` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_price_sheet` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_role_activity` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_supplier_price` (command) — definition read; **not executed** (read-only run)
- [s] `verity.trading.set_tax_rule` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.stock_availability` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.stock_ledger` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.stock_on_hand` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.submit_purchase_order` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.supplier_detail` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.supplier_prices` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.tax_settings` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.tax_summary` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.top_customers` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.top_items` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [s] `verity.trading.transfer_stock` (command) — definition read; **not executed** (read-only run)
- [r] `verity.trading.unbilled_movements` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.weekly_purchase_totals` (query) — reached through the route sweep where a page calls it; not asserted row-by-row
- [r] `verity.trading.weekly_sales_totals` (query) — reached through the route sweep where a page calls it; not asserted row-by-row

## What is honestly untested

- **Every command.** No write was performed anywhere. Authorization refusal, precondition
  enforcement, Activity/DomainEvent recording and idempotency on commands are therefore
  **source-reviewed at best**. The brief's three-things-per-key test (reachable / authorized /
  recorded) was answered for *reachable* only.
- **Every schedule and notification key** (`sweep_low_stock`, `sweep_prep_breaches`,
  `capture_metric_snapshot`, `low_stock`, `item_ready`): running them means running work.
- **Every workspace queue** (`dinein.open_bills`, `dinein.tables_to_clean`,
  `plywood.low_stock`): reachable only through `/workspace`, which failed to render (F-001).
- **The whole of Phase 2** — killing the database mid-command, restoring an empty schema,
  replaying the migration chain from zero, seed idempotency, backup and restore, deliberate
  pool exhaustion, storage/auth outage simulation, clock skew, concurrency and double-submit,
  500-line orders and 2,500-product generation, financial-year rollover. Every one of these is
  destructive or requires writes against what is a **production database**. None was run.
  Note that the pool-exhaustion case did not need provoking — it is happening under ordinary
  single-user load (F-001).
- **Phase 6 in full** — 320/768/1440 px, keyboard-only completion of a sale, focus trapping,
  screen-reader labels, both themes, reduced motion, hydration-mismatch console sweep. Only
  console **errors** were collected during the route sweep, and only on the pages that rendered.
- **The dine-in and kitchen surfaces**, which the brief names as the best test of whether the
  platform is genuinely multi-capability. Activating a capability is a write, so it was not done.
- **`npm run test`** — the brief requires asking first, and it reseeds the live database.
- **`npm run build`** — not run; the production bundle was audited by downloading the deployed
  chunks instead.