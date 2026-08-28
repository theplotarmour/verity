# Verity Platform UX Redesign Specification

This document audits the user experience across all client and operator surfaces, details the current shortcomings (referencing the captured interface screens), and proposes clear, Odoo-inspired UX models.

---

## 1. Landing Experience

### Current UX
*   **Behavior**: When a Platform Operator logs in, they land on the standard root path `/` (client workspace view) rather than `/hq`. They must manually open the switcher and select the Platform Tenant before they can view `/hq`.
*   **Friction**: Unnecessary clicks. The system is designed to separate operators from standard client interfaces, yet they are routed to the client workspace by default.

### Proposed UX (Odoo / SaaS Inspiration)
*   **Direct Pathing**: Upon sign-in, the authentication wrapper reads the user's active membership. If their active context or primary role is a Platform Operator, the router redirects them **directly to `/hq`**.
*   **Handoff Workspace Switcher**: If the operator wants to view a specific client's workspace, they use a distinct "Open Client Workspace" option in `/hq/clients` to hop over to the client view context.

---

## 2. Capability Registry & App Activation

### Current UX (See Image 1: Capability Registry)
*   **Screen**: `/capabilities`
*   **Friction**: 
    1.  **Exposed System Primitives**: Clients see raw database-level capability labels (e.g., *Asset*, *Approval*, *Evidence*) with technical annotations like `v1.0.0 · pinned at 1.0.0 · 1 entity`.
    2.  **Client-Side Disruption**: Clients are allowed to deactivate core capabilities directly. Deactivating a capability breaks dependent packages and hides database columns.
    3.  **No Visual Association**: Activating a capability does not change the client navbar until the admin manually maps permissions in the roles panel.

```
[Current Layout]
Capability Registry (Client View)
─────────────────────────────────────────────
[ Dine-in ] v1.0.0 · 9 entities         [Activate]
[ Plywood ] Depends on location         [Deactivate]
```

### Proposed UX (Odoo-Inspired App Store)
*   **Hide Registry from Client**: Move capability activation completely inside the **Operator HQ console** under `/hq/clients/[tenantId]/modules`. Standard clients should never see raw capability definitions.
*   **Odoo-style App Store**: If self-installation is permitted, clients see an **Apps** dashboard showing clean, themed cards (e.g., *Inventory Management*, *POS Dine-In*) instead of system strings.
*   **Automatic Role Seeding**: Clicking "Install" on an App automatically seeds the default manager/viewer roles and grants them to the installing administrator, instantly updating the navbar.

```
[Proposed Layout]
App Directory (Client View)
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   Inventory    │ │ Dine-in POS    │ │   Scheduling   │
│  [ Install ]   │ │  [ Install ]   │ │  [ Installed ] │
└────────────────┘ └────────────────┘ └────────────────┘
```

---

## 3. Configuration Management

### Current UX (See Image 2: Configuration)
*   **Screen**: `/configuration`
*   **Friction**: 
    1.  **Code-level Keys**: Parameters are listed by their database identifiers (e.g., `verity.plywood.tax.cgst_rate_bp`).
    2.  **Raw Input Fields**: Values are typed into bare inputs with no validation (e.g., typing text into a tax rate parameter field causes database failures).
    3.  **Lack of Grouping**: All settings parameters are dumped in a single flat list.

```
[Current Layout]
Configuration
─────────────────────────────────────────────
verity.plywood.tax.cgst_rate_bp
[ 900 ]                                  [Save]
```

### Proposed UX (Odoo-style Settings Panels)
*   **Structured Sidebar**: A left navigation sidebar divides settings by installed App (e.g., *General*, *Taxes*, *Asset Settings*).
*   **Human-Readable Labels**: Map database keys to friendly UI inputs (e.g., `verity.plywood.tax.cgst_rate_bp` displays as a number input labeled **"CGST Tax Rate (%)"**).
*   **Precedence Indicators**: Display visual badges showing whether a setting is inherited from the *Platform Default*, set as a *Tenant Default*, or overridden at an *Organization/Branch* level.

```
[Proposed Layout]
Settings
General      │  Taxes & Accounts
Inventory    │  ──────────────────────────────────
► Taxes      │  CGST Tax Rate (%)
             │  [ 9.00 ]                   [Save]
             │  (Badge: Tenant Override)
```

---

## 4. Role & Permission Management

### Current UX (See Image 3: Roles)
*   **Screen**: `/hq/clients/[tenantId]/roles`
*   **Friction**: 
    1.  **Horrible Code String Mapping**: To grant a permission, the operator or client must manually type code-level database class strings (like `verity.platform.membership` or `verity.asset.asset`) in a text box. A typo silently breaks access.
    2.  **Cluttered List View**: The screen lists dozens of separate row items for each verb (`Read`, `Create`, `Edit`, `Delete`) making audit impossible.

```
[Current Layout]
Grant a permission:
Verb: [Read] Entity: [                     ] Scope: [Tenant] [Grant]
```

### Proposed UX (Checkbox Matrix)
*   **App-Grouped Matrix**: Group entities by their parent capability (e.g., *Asset Management*). Display permissions as a clean checklist matrix.
*   **Human-Readable Actions**: Replace database verbs and entities with action labels:
    *   `Read` on `verity.asset.asset` → **View Assets**
    *   `Create`/`Edit` on `verity.asset.asset` → **Manage Assets**
*   **Role Templates**: Provide one-click templates (e.g., *Manager*, *Supervisor*, *Read-Only*) that auto-check the appropriate matrix items.

```
[Proposed Layout]
Manage Permissions: Asset Manager
─────────────────────────────────────────────
Capability: Asset Management
[x] View Assets (Read verity.asset.asset)
[x] Create/Edit Assets (Create/Edit verity.asset.asset)
[ ] Delete Assets (Delete verity.asset.asset)

Capability: Locations
[x] View Locations
[ ] Manage Locations
```
 Richmond.
