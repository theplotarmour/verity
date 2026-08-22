# Module: Website Builder

## Purpose
The `website` module manages the online storefront, public content pages, menus, and client portals.

## Scope
- Powers public website configuration (`website` model).
- Builds page definitions (`website.page`) and navigation templates.
- Serves ecommerce catalog pages (when integrated with `website_sale`).
- Integrates with controllers for public form submittals and traffic routing.

## Major Entities

### 1. Website (`website`)
- **Type**: Persistent Model.
- **Purpose**: Configuration node for an active website instance.
- **Fields**:
  - `name`: Site title.
  - `domain`: Associated domain name.
  - `company_id`: Mapped legal company (`Many2one`).

### 2. Website Page (`website.page`)
- **Type**: Persistent Model.
- **Purpose**: Holds webpage templates.

## Core Workflows
- **Content Publishing**:
  - Page records toggle their visibility based on publication switches (`is_published` boolean). Unpublished pages are visible only to backend website administrators.

## Permissions
- Model Access is defined in `addons/website/security/ir.model.access.csv`.
- **Groups**:
  - `website.group_website_publisher`: Can write, publish, and customize website layouts.
  - `website.group_website_designer`: Access to templates and media manager libraries.

## Traceability
- **Module Directory**: `addons/website`
- **Model Path**: `addons/website/models/website.py`
