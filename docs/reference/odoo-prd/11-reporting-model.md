# Reporting and Analytics Model

Odoo provides document printing (PDF/HTML) and interactive dashboards (Spreadsheets) for business reporting.

## 1. QWeb PDF/HTML Document Reporting (`ir.actions.report`)
The primary system for generating customer-facing business documents (e.g., invoices, sales orders, purchase orders, delivery slips) is the **QWeb Reporting Engine**.

### Rendering Sequence
1. **Trigger**: A user clicks a print button in the UI or an automated rule triggers a print event.
2. **QWeb Evaluation**: The server loads the report record (`ir.actions.report`) and resolves its QWeb XML templates.
3. **HTML Construction**: The template is rendered into HTML using record-specific data.
4. **PDF Conversion**: The Odoo server invokes **`wkhtmltopdf`** in a sub-process, passing the generated HTML string to render a PDF document.

### Structural Templates
Reports use standard layouts for consistent page headers and footers:
- `web.external_layout`: Standard corporate layout. Includes the company logo, name, tax ID, page numbers, and contact details.
- `web.internal_layout`: Minimalist header suitable for internal-only reporting (such as stock inventory worksheets).

---

## 2. Spreadsheet Dashboards (`spreadsheet` & `spreadsheet_dashboard`)
For real-time operational and financial analytics, Odoo integrates a client-side spreadsheet engine.

### Key Capabilities
- **Pivot Tables**: Users can slice and group database records along multiple dimensions (e.g. Sales by Product Category vs Month).
- **KPI Dashboards**: Aggregates metrics (e.g. Total Revenue, Gross Margin, Average Order Value) into high-visibility cards.
- **Dynamic Filtering**: Dashboards can be filtered on the fly by Date Range, Sales Team, or Company.
- **Spreadsheet Formula Engine**: Supports standard spreadsheet syntax (e.g., `SUM`, `AVERAGE`, `VLOOKUP`) and Odoo-specific data-lookup formulas (e.g. `ODOO.PIVOT.HEADER`, `ODOO.CREDIT`).
