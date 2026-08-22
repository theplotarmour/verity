# Odoo 19.0 Product Requirements Document (PRD)

This directory contains the reverse-engineered functional and behavioral Product Requirements Document (PRD) of Odoo 19.0. It is an implementation-independent specification representing the codebase as faithful functional requirements.

## Directory Structure

- [`00-executive-system-overview.md`](file:///d:/Code/odoo-19.0/odoo-prd/00-executive-system-overview.md) — High-level system goals, core modules, and primary business workflows.
- [`01-repository-inventory.md`](file:///d:/Code/odoo-19.0/odoo-prd/01-repository-inventory.md) — Detailed inventory of modules in the repository.
- [`02-architecture.md`](file:///d:/Code/odoo-19.0/odoo-prd/02-architecture.md) — Modular extension architecture, loading mechanics, and system lifecycle.
- [`03-meta-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/03-meta-model.md) — Underlying conceptual meta-model (inheritance, field types, computed fields).
- [`04-security-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/04-security-model.md) — Security model (Access Control Lists, Record Rules, security groups).
- [`05-identity-and-access.md`](file:///d:/Code/odoo-19.0/odoo-prd/05-identity-and-access.md) — Multi-company support, user types (internal, portal, public), authentication.
- [`06-data-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/06-data-model.md) — High-level entity relationships and data design patterns.
- [`07-workflow-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/07-workflow-model.md) — Core business flow lifecycles (Quotation -> Sales -> Stock -> Billing -> Cash).
- [`08-automation-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/08-automation-model.md) — Cron jobs, automated server actions, and notifications.
- [`09-ui-ux-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/09-ui-ux-model.md) — View structures (form, tree, kanban, search) and front-end capabilities.
- [`10-api-and-integration-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/10-api-and-integration-model.md) — JSON-RPC, XML-RPC, HTTP controllers, and webhooks.
- [`11-reporting-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/11-reporting-model.md) — PDF/QWeb, Spreadsheet engines, and Dashboards.
- [`12-localization-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/12-localization-model.md) — Translations and localization mechanics.
- [`13-testing-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/13-testing-model.md) — Test suite architecture and behavioral verification criteria.
- [`14-error-and-exception-model.md`](file:///d:/Code/odoo-19.0/odoo-prd/14-error-and-exception-model.md) — User validations, transactional exception handling, and boundaries.
- [`15-cross-module-dependencies.md`](file:///d:/Code/odoo-19.0/odoo-prd/15-cross-module-dependencies.md) — Module dependency mapping and critical code paths.

## Scoped Folders

### 1. Modules (`modules/`)
- [`base.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/base.md) — Foundational model layers and setups.
- [`mail.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/mail.md) — Collaborative hub (chatter, activities, notifications).
- [`sale.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/sale.md) — Customer quotations and sales order management.
- [`purchase.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/purchase.md) — Vendor procurement RFQs and purchase agreements.
- [`stock.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/stock.md) — Inventory locations, pickings, and stock movements.
- [`account.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/account.md) — Financial ledgers, invoices, bills, and payments.
- [`crm.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/crm.md) — Leads, opportunities, and deal stages.
- [`project.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/project.md) — Projects, tasks, and task stages.
- [`mrp.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/mrp.md) — Manufacturing bills of materials and production orders.
- [`point_of_sale.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/point_of_sale.md) — POS retail sessions and checkout transactions.
- [`hr.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/hr.md) — Employee profiles and company departments.
- [`website.md`](file:///d:/Code/odoo-19.0/odoo-prd/modules/website.md) — Website layout designer pages and portal routes.

### 2. Entities (`entities/`)
- [`res-partner.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/res-partner.md) — Contact cards.
- [`sale-order.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/sale-order.md) — Sales orders.
- [`purchase-order.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/purchase-order.md) — Purchase orders.
- [`product-template.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/product-template.md) — Catalog templates and variants.
- [`stock-picking.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/stock-picking.md) — Warehouse picking transfers.
- [`account-move.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/account-move.md) — Invoices and ledger journal entries.
- [`crm-lead.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/crm-lead.md) — Leads and sales opportunities.
- [`project-task.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/project-task.md) — Project tasks.
- [`mrp-production.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/mrp-production.md) — Manufacturing production orders.
- [`pos-order.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/pos-order.md) — POS sale tickets.
- [`hr-employee.md`](file:///d:/Code/odoo-19.0/odoo-prd/entities/hr-employee.md) — Employee profile entries.

### 3. Workflows (`workflows/`)
- [`quote-to-cash.md`](file:///d:/Code/odoo-19.0/odoo-prd/workflows/quote-to-cash.md) — Quotation to delivery and final invoicing/payment.
- [`procure-to-pay.md`](file:///d:/Code/odoo-19.0/odoo-prd/workflows/procure-to-pay.md) — Purchasing RFQs, incoming shipments, and invoice reconciliation.
- [`lead-to-opportunity.md`](file:///d:/Code/odoo-19.0/odoo-prd/workflows/lead-to-opportunity.md) — Pipeline lead conversion.
- [`manufacturing-flow.md`](file:///d:/Code/odoo-19.0/odoo-prd/workflows/manufacturing-flow.md) — BoM reservation and manufacturing closing.
- [`pos-checkout.md`](file:///d:/Code/odoo-19.0/odoo-prd/workflows/pos-checkout.md) — POS checkout orders and session reconciliation.

### 4. Specialized Folders
- **Capabilities (`capabilities/`)**: [`order-pricing-discounts.md`](file:///d:/Code/odoo-19.0/odoo-prd/capabilities/order-pricing-discounts.md) – Dynamic price tables.
- **Integrations (`integrations/`)**: [`payment-terminals.md`](file:///d:/Code/odoo-19.0/odoo-prd/integrations/payment-terminals.md) – Local and POS terminal protocols.
- **Security (`security/`)**: [`record-rules-inventory.md`](file:///d:/Code/odoo-19.0/odoo-prd/security/record-rules-inventory.md) – Operational data database query filters.
- **Reports (`reports/`)**: [`qweb-layouts.md`](file:///d:/Code/odoo-19.0/odoo-prd/reports/qweb-layouts.md) – Corporate documents formatting rules.

### 5. Verification & Validation
- [`traceability/core-requirements.md`](file:///d:/Code/odoo-19.0/odoo-prd/traceability/core-requirements.md) — Functional requirements mapped to source code files and methods.
- [`research/contradictions-and-unknowns.md`](file:///d:/Code/odoo-19.0/odoo-prd/research/contradictions-and-unknowns.md) — Anomalies, dynamic data configurations, and partial code limits.
- [`decisions/scoping-boundaries.md`](file:///d:/Code/odoo-19.0/odoo-prd/decisions/scoping-boundaries.md) — Design rationales and scoping decisions.
