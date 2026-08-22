# Metabase — Concept Inventory

Source: Metabase Documentation and repository models (GitHub: metabase/metabase master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Question (Card)

Source evidence: `src/metabase/models/card.clj`
Definition: A saved database query containing search criteria, aggregations, and visualization preferences.
Key attributes:
- `id` (Integer)
- `name` (String)
- `dataset_query` (JSON/Clojure map representing the query: source table, filters, joins, aggregations)
- `display` (String: table | bar | line | map | card)
- `visualization_settings` (JSON setting colors, labels, axis formatting)
Relationships: Belongs to a Collection; can be embedded inside Dashboards.

---

### Dashboard

Source evidence: `src/metabase/models/dashboard.clj`
Definition: A visual grid containing one or more Cards, offering a consolidated view of business metrics.
Key attributes:
- `id` (Integer)
- `name` (String)
- `description` (Text)
- `parameters` (List of filters that can be applied globally to all cards on the dashboard)
Relationships: Contains a list of DashboardCards (association model linking Dashboard and Card with layout positions: `size_x`, `size_y`, `row`, `col`).

---

### Collection

Source evidence: `src/metabase/models/collection.clj`
Definition: A folder-like organization mechanism used to group Questions and Dashboards.
Purpose: Grouping reports by department/tenant and applying access permissions.
Relationships: Has parent/child relationships (nested folders).

---

### Data Permissions (Sandbox)

Source: Metabase Enterprise Permissions documentation
Definition: Rules mapping user groups to specific database schemas, tables, or row-level visibility filters.
Key attributes:
- `graph` (Permissions graph mapping group -> database -> schema -> access level)
- `row_level_filters` (Injecting user attributes directly into SQL WHERE clauses when executing questions)
Notes for Verity: Essential mechanism for multi-tenant analytical dashboards.
