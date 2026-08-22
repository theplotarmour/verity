# Repository Inventory

## Repository Structure
The local Odoo 19.0 repository contains the core execution engine and framework code alongside standard functional application modules (addons).

```
odoo-19.0/
├── odoo-bin                     # Startup script for Odoo Server
├── requirements.txt             # Declared Python library dependencies
├── odoo/                        # Core Framework and Server codebase
│   ├── addons/                  # Core baseline modules
│   │   └── base/                # The foundational res.* and ir.* models
│   ├── cli/                     # CLI command handlers
│   ├── orm/                     # ORM implementation (models, fields, domains)
│   └── service/                 # Server execution and database processes
└── addons/                      # Standard functional modules (632 total)
    ├── mail/                    # Collaborative thread, tracking, activities
    ├── product/                 # Product templates, variants, pricing
    ├── sale/                    # Quotation and Sales Order engine
    ├── purchase/                # RFQ and Purchase Order engine
    ├── stock/                   # Inventory, locations, pickings, moves
    └── account/                 # Invoices, payments, journals, ledgers
```

## Module Statistics
- **Core Addons (odoo/addons/)**: 24 modules (primarily `base` and framework test suites).
- **Extra Addons (addons/)**: 632 modules (including localized accounting charts, payment acquirers, and cross-functional extensions).
- **Total Application Modules**: 34 top-level apps that appear as installable business applications in the interface.

## Primary Application Modules (Apps)

Below is the technical metadata of the primary application modules representing Odoo's business capabilities:

| Technical Name | Human-Readable Name | Category | Primary Dependencies | Application? |
| :--- | :--- | :--- | :--- | :--- |
| `base` | Base | Undefined | (None) | No (Core Library) |
| `mail` | Discuss | Productivity/Discuss | `base`, `web` | Yes |
| `product` | Products | Sales/Sales | `base`, `mail` | No (Shared Library) |
| `sale` | Sales | Sales/Sales | `product`, `mail` | No (Shared Library) |
| `sale_management` | Sales | Sales/Sales | `sale` | Yes |
| `purchase` | Purchase | Inventory/Purchase | `product`, `mail` | Yes |
| `stock` | Inventory | Inventory/Inventory | `product`, `mail` | Yes |
| `account` | Invoicing | Accounting/Accounting | `product`, `portal` | Yes |
| `crm` | CRM | Sales/CRM | `sales_team`, `mail` | Yes |
| `mrp` | MRP | Manufacturing/Manufacturing | `stock`, `product` | Yes |
| `point_of_sale` | Point of Sale | Sales/Point of Sale | `stock`, `account` | Yes |
| `project` | Project | Services/Project | `mail`, `portal` | Yes |
| `website` | Website | Website/Website | `portal`, `web` | Yes |
| `hr` | Employees | Human Resources | `base`, `mail` | Yes |

## Cross-Module Extensions
Odoo relies heavily on modular class inheritance (`_inherit`). This means functional modules often extend entities and behaviors of other modules without modifying their original code:

- `sale_stock`: Extends `sale` and `stock`. Links Sales Orders directly to Stock Pickings (delivery orders) and handles quantity reservation rules.
- `sale_purchase`: Extends `sale` and `purchase`. Automatically triggers Requests for Quotations (RFQs) from Sales Orders when procurement rules require purchasing from a vendor.
- `purchase_stock`: Extends `purchase` and `stock`. Links Purchase Orders to incoming stock receipts.
- `stock_account`: Extends `stock` and `account`. Triggers automatic accounting journal entries (valuation moves) upon stock receipt or shipment.
- `mrp_account`: Extends `mrp` and `account`. Calculates production cost variances and registers them in the accounting ledger.
