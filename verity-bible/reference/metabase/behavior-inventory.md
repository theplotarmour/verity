# Metabase — Behavior Inventory

Source: Metabase Documentation and repository models (GitHub: metabase/metabase master branch)
Date inspected: 2026-08-22
Confidence: HIGH

---

### Dashboard Parameter Mapping & Execution

Source: Dashboard Parameters Reference
Trigger: User selects a filter value on a Dashboard (e.g. territory = "North").
Steps:
1. Identify the dashboard parameter type (e.g. category, date, geo).
2. Lookup mappings: each parameter points to specific fields in the underlying Cards (e.g. Card A's `work_orders.territory` field).
3. Generate SQL/query by injecting the parameter value into the `dataset_query` of each Card.
4. Execute queries against target database in parallel.
5. Return results to populate the visualization.
Failure handling: If a Card has incompatible data types or is missing the mapped field, return an execution error for that card while others load.

---

### Row-Level Data Sandboxing

Source: Metabase Row-Level Permissions Documentation
Trigger: A user runs a Card (question) or loads a Dashboard.
Preconditions: User belongs to a Group with row-level data restrictions.
Steps:
1. Lookup the sandbox policy for the user's group on the target table.
2. The sandbox policy contains a lookup query (e.g., `SELECT table_id FROM permissions WHERE user_id = USER_ID`).
3. Intercept the Card's `dataset_query` and rewrite the AST (Abstract Syntax Tree) to join/filter with the sandbox lookup query.
4. Execute the rewritten SQL query against the data source.
Notes for Verity: Enforces strict data tenancy boundaries at the query execution layer, meaning a user can never execute SQL that queries another tenant's data.
