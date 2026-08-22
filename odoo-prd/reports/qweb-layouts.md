# Reports: QWeb Document Layouts

## Purpose
Specifies QWeb reporting structures, templates, and dynamic XML rendering conventions.

## Core Templates

### 1. `web.external_layout`
- **Purpose**: Defines corporate customer-facing layout templates.
- **Components**:
  - Header: Displays company logo, registration numbers, tax offices, and document titles.
  - Footer: Displays page counts, bank details, contact emails, and tax identifiers.

### 2. `web.html_container`
- **Purpose**: Wraps the raw rendered report content inside a standard HTML body containing stylesheet assets and printing layout contexts before sending the payload to the PDF compiler.

## Traceability
- **Source Module**: `base`, `web`
- **Source Files**: `odoo/addons/base/views/report_templates.xml`
