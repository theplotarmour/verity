# Architectural and Scoping Decisions

This document registers critical scoping and design boundaries established during the Odoo 19.0 PRD extraction.

---

## Decision 1: Scoping of Core ERP Modules vs Localizations

### Context
Odoo 19.0 contains 632 standard extra addons and 24 core addons. A large portion of these are country-specific accounting localizations (`l10n_*`) or third-party payment provider connectors (e.g. `payment_adyen`, `payment_paypal`). Exhaustive documentation of all modules is functionally repetitive and would result in document bloat.

### Decision
The detailed entity-by-entity, workflow-by-workflow, and exception specifications are strictly scoped to Odoo's primary cross-functional flow:
- **Foundations**: `base`, `mail`, `web`, `portal`
- **Master Data**: `product`, `uom`
- **Transactions**: `sale`, `purchase`, `stock`, `account`

All remaining 600+ modules are mapped and categorized in the [Module Inventory](file:///d:/Code/odoo-19.0/odoo-prd/01-repository-inventory.md).

### Rationale
This ensures that future product and engineering teams understand the complete, unbroken business flow of Odoo (Lead -> Sales Order -> Stock Delivery -> Invoicing -> Payment Reconciliation) without being distracted by minor localization configurations.

---

## Decision 2: Multi-Company Security on the ORM Layer

### Context
Odoo is designed to support multiple companies inside the same database instance.

### Decision
Multi-company isolation is enforced at the ORM layer using dynamic PostgreSQL query filters (`ir.rule` record rules) rather than separate schemas or physical partition keys.

### Rationale
Using record rules allows for shared global data (such as currencies and base product descriptions) while strictly partitioning private transactional data (such as sales orders and invoices).
