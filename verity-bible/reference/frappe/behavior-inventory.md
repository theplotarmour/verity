# Frappe — Behavior Inventory

Source: frappe/model/document.py, frappe/permissions.py, frappe/model/db_query.py
Commit: 94e20b2f70153b1c6e70c6a41755c3e1acaf0647

---

### Document Save Lifecycle (Insert)

Source evidence: `frappe/model/document.py:691` (in `insert()`)
Trigger: Calling `.insert()` on a new Document.
Preconditions: User must have `create` permission.
Steps:
1. `_set_defaults` and `set_user_and_timestamp`.
2. Check permissions and `check_if_latest`.
3. `run_method("before_insert")`.
4. `set_new_name` (Naming Series resolution).
5. Run validations and `before_save` hooks.
6. DB insert for parent and all child tables.
7. `run_method("after_insert")`.
State changes: `__islocal` removed, database records created.
Side effects: File attachments linked, global search updated, `doctype_update` events fired.
Failure handling: Raises `PermissionError`, `ValidationError`. Database transaction rolled back.
Notes for Verity: Extensive lifecycle hooks allow strong extensibility around data mutations.

---

### Permission Check

Source evidence: `frappe/permissions.py:81` (`has_permission`)
Trigger: Attempting to read or mutate a document.
Preconditions: Valid user session and doctype.
Steps:
1. Administrator bypass.
2. Check module status (disabled apps blocked).
3. Check `DocPerm` for matching user roles.
4. Check contextual `User Permission` (record-level restrictions).
5. Check if document is explicitly shared with the user.
State changes: None (pure check).
Failure handling: Returns False or raises `frappe.PermissionError`.
Notes for Verity: Logic cascades through roles → user overrides → shares.

---

### Database Query Scoping

Source evidence: `frappe/model/db_query.py:113` (`DatabaseQuery.execute`)
Trigger: Fetching list of records via `frappe.get_list` or `frappe.get_all`.
Steps:
1. `check_read_permission` to verify user can view the DocType.
2. `build_conditions` to parse filters and generate SQL `WHERE` clauses.
3. `apply_fieldlevel_read_permissions` to strip columns the user cannot view.
4. If contextual user permissions exist, append to SQL `WHERE` via `build_match_conditions`.
5. Execute query and `mask_fields` if masking rules apply.
Failure handling: Raises `frappe.PermissionError` if initial read check fails.
Notes for Verity: Enforces both record-level row visibility AND column-level field visibility at the query-building stage — not in application code.
