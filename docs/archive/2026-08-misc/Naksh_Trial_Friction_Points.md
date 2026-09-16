# Naksh Plywood Business Trial: Friction Points & Bug Log

*   **Date**: 2026-08-29
*   **Target File**: `Naksh_Trial_Friction_Points.md`
*   **Status**: Identified & Analyzed (Ready for Implementation Phase)

---

## 1. Database & Infrastructure Issues

### 🔴 PgBouncer Connection Pool Exhaustion (`EMAXCONNSESSION`)
*   **Symptom**: The application threw `FATAL: max clients reached in session mode (limit: 15)` and froze.
*   **Root Cause (as first diagnosed, 2026-08-29)**: `connection_limit=10` in `.env`, with the dev server running alongside Vitest/Playwright, exceeding the 15-session pool.
*   **Actual root cause (2026-09-01)**: `DATABASE_URL` pointed at port **5432, the pooler in session mode**. Session mode pins one server connection per client for that client's entire life, out of a pool of 15 for the whole project — so the limit is reached by a handful of processes no matter how the client-side `connection_limit` is tuned. Lowering it only delays the failure. It then recurred in production on Vercel, where each serverless instance is another such client.
*   **Why 5432 was chosen**: `.env.example` asserted that "transaction-mode pooling (6543) cannot start" the interactive transaction `withTenant` needs. That is false. Transaction mode holds a connection for the life of a transaction and releases it at COMMIT; what it cannot carry is session state held *between* transactions, and nothing here keeps any — the tenant GUC is `set_config(..., true)` and the only lock is `pg_advisory_xact_lock`, both transaction-scoped.
*   **Fix**: `DATABASE_URL` moved to port **6543** (transaction mode) with `pgbouncer=true` and `connection_limit=5`. Verified against the live database first: the GUC round-trips inside `withTenant`, RLS filters correctly, and eight concurrent tenant-scoped transactions all succeed.
*   **Status**: Fixed.

---

## 2. Navigation & Interface Clutter

### ⚠️ Duplicate "Overview" Sidebar Items
*   **Symptom**: Two identical "Overview" links appeared on the sidebar.
*   **Root Cause**: A namespace collision. The base shell layout provides `/` (named "Overview") and the Plywood capability registers a second nav item pointing to `/overview` (also named "Overview").
*   **Solution**: Rename the Plywood capability navigation label to "Plywood Dashboard" or "Business Overview".

### ⚠️ Generic Platform Links Exposing Raw Primitives
*   **Symptom**: Generic "Locations" and "Assets" links cluttered Naksh's sidebar.
*   **Root Cause**: Because Naksh was granted tenant-wide roles, the system drew every active capability's generic primitives.
*   **Solution**:
    *   Hide generic **Locations** (Naksh manages physical locations through the custom **Godowns** interface).
    *   Hide **Assets** (car/truck tracking is irrelevant for their core plywood business).

### ⚠️ Exposing Platform Admin Items to Clients
*   **Symptom**: Naksh saw raw administrative links like "Capability registry" and developer-style "Configuration" keys.
*   **Root Cause**: Client role configuration did not separate operator-only interfaces from client-local settings.
*   **Solution**: Restrict `/capabilities` to operators, and replace the database-key configuration panel with a user-friendly app settings page.

---

## 3. Workflow & Seeding Blockers

### 🚫 Missing "New Location" Button (DataTable Empty-State Bug)
*   **Symptom**: On the `/locations` screen, there was no button or action to add a new location, leaving the user locked out of setting up their first godown.
*   **Root Cause**: The `DataTable.tsx` component returns early when `rows.length === 0`, completely skipping the rendering of the `toolbar` containing the creation form.
*   **Solution**: Modify `DataTable.tsx` to ensure that if `rows.length === 0`, the table toolbar is not hidden. Instead, map the primary creation button directly into the `emptyAction` slot of the `<EmptyState />` component.

### 🚫 Greyed-Out Business Actions (Lack of Contextual Guidance)
*   **Symptom**: Buttons like "Set a price", "New order", and "New shipment" were disabled/greyed out with no explanation.
*   **Root Cause**: Strictly correct database logic (you cannot set a price if the product catalog is empty; you cannot ship if there are no sales orders), but poor user feedback.
*   **Solution**: Instead of silently disabling the buttons, make them clickable to show a tooltip or guide detailing the missing prerequisite setups.

---

## 4. Permission & Role Setup Limitations

### ⚠️ Raw DB Verbs in Roles UI
*   **Symptom**: The roles checkbox matrix only exposes standard DB verbs: `VIEW` (`Read`), `MANAGE` (`Create`/`Edit`), and `DELETE` (`Delete`).
*   **Root Cause**: Permission mappings are directly exposed from database structures rather than translated to client-facing business activities.
*   **Solution**: Map permissions to friendly checkboxes like *"Can Approve Customer Credit"* or *"Can Dispatch Shipments"*.
