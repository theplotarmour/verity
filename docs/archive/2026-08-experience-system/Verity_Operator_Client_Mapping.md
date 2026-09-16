# Verity Operator vs. Client Responsibility Mapping & Odoo Solutions

*   **Date**: 2026-08-29
*   **Target File**: `Verity_Operator_Client_Mapping.md`
*   **Concepts Sourced**: `odoo-prd/04-security-model.md` and `odoo-prd/09-ui-ux-model.md`

---

## 1. Responsibility Matrix: Who Should Do What?

To maintain the architectural boundaries defined in **ADR-005** and **ADR-013**, we define the operational scopes of the Platform Operator vs. the Client:

| Operational Area | Platform Operator (HQ) | Client User (Workspace) |
| :--- | :--- | :--- |
| **Workspace Creation** | **Yes** (Creates and initializes the Tenant database mapping). | **No** (Cannot spawn new tenants). |
| **Capability Licensing** | **Yes** (Activates/Deactivates capabilities like *Plywood* or *Assets*). | **No** (Cannot change subscription boundaries). |
| **System Audit Trails** | **Yes** (Monitors platform-wide security audit and error telemetry). | **Local Only** (Views client-scoped activity logs like order changes). |
| **Organizational Chart** | **No** (Does not manage client branch structures). | **Yes** (Builds nested depots, regions, and offices). |
| **Role Customization** | **No** (Does not dictate client organizational charts). | **Yes** (Creates custom business roles and assigns permissions). |
| **Operational Business** | **No** (Cannot view or create client orders, inventory, or billing records). | **Yes** (Manages the catalogue, places orders, dispatches trucks). |

---

## 2. Gap Analysis: Current Codebase vs. Target Vision

Our audit of the codebase reveals several key discrepancies where client and operator boundaries are currently blurred:

### A. The Capability Registry Leak
*   **Current State**: Standard clients can navigate to `/capabilities` and toggle core system capabilities themselves.
*   **Target State**: Only operators can toggle capabilities. Clients should only see an Odoo-style "App Store" where pre-licensed apps can be enabled, while raw system registry views are blocked.

### B. Raw Configuration Keys Exposure
*   **Current State**: Clients edit parameters via raw database-level keys (`verity.plywood.tax.cgst_rate_bp`) on the `/configuration` screen.
*   **Target State**: Clients manage parameters via app-specific panels with friendly labels ("CGST Rate"). Operators manage platform-wide falls and GUC settings in HQ.

### C. Context Switching Blindness
*   **Current State**: Logged-in operators land on the client workspace homepage `/` and must manually switch to "Verity Platform" before accessing `/hq`.
*   **Target State**: Operators land directly in the `/hq` dashboard on sign-in.

---

## 3. Odoo-Inspired Solutions for Verity

By analyzing Odoo's product requirements (`odoo-prd`), we can resolve our primary UI/UX friction points:

### Solution A: Self-Seeding Security Groups (Solving "Invisible Modules")
*   **Odoo Reference (`ir.model.access.csv`)**: Odoo modules ship with predefined XML security groups (e.g., `base.group_user`, `sale.group_sale_manager`). Installing an app automatically assigns these groups to the admin user.
*   **Verity Application**: When an operator activates a Capability for a tenant, the system should execute a **self-seeding handler**. 
    *   *Action*: Automatically create standard client roles (e.g., *Plywood Manager*, *Plywood Viewer*) and map the necessary `Read`/`Create`/`Edit` permissions.
    *   *Benefit*: The newly activated capability is instantly visible in the client's navbar without manual permission mapping.

### Solution B: Empty State CTA Redirection (Solving "Missing Buttons")
*   **Odoo Reference (List View Empty State)**: When an Odoo model contains 0 records, the list view shows a large, central empty-state panel with a prominent, clickable "Create [Record]" button in the middle of the screen.
*   **Verity Application**: Fix the `DataTable` early exit bug.
    *   *Action*: Modify `DataTable.tsx` to ensure that if `rows.length === 0`, the table toolbar is not hidden. Instead, map the primary creation button directly into the `emptyAction` slot of the `<EmptyState />` component so it is centered on the screen.

### Solution C: Context-Aware Tooltips (Solving "Greyed Out Buttons")
*   **Odoo Reference (Form Header Action Gating)**: Odoo buttons change visual states or trigger validation wizards based on relational dependencies.
*   **Verity Application**: Instead of rendering standard disabled/greyed-out buttons, bind helper states:
    *   If `verity.plywood.create_sales_order` is disabled because there are 0 products in the catalogue, show a tooltip: *"Add at least one product to your Catalogue before creating a sales order."*
    *   This guides the client through their setup sequence naturally.
