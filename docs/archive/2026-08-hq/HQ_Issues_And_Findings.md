# Verity HQ & Tenant Workspace: Issues and Findings Log

*   **Date**: 2026-08-28
*   **Target File**: `HQ_Issues_And_Findings.md`
*   **Purpose**: A dedicated ledger documenting the specific issues raised during visual/operational testing and the corresponding technical findings from the codebase.

---

## Issue 1: Operators Land on Client Workspace `/` Instead of `/hq`

### The Issue
When a Platform Operator logs in, they land on the standard client workspace homepage `/` and are forced to use the switcher header to select "Verity Platform" before they can access `/hq`.

### Codebase Findings
*   **Sign-in Handoff**: The file [global-setup.ts](file:///d:/Code/verity/e2e/global-setup.ts#L25-L53) and standard login routes redirect users directly to `/`. 
*   **Context Isolation (ADR-013)**: The server verifies the active membership session. Because the operator account contains memberships in both the Platform Tenant and client tenants, the router falls back to the client tenant's homepage. The system has no automatic redirection logic routing users with operator permissions straight to the HQ console.

---

## Issue 2: Clients Can View and Toggle Raw Platform Capabilities

### The Issue
The client workspace contains a "Capability Registry" menu displaying raw system-level modules (e.g., *Asset*, *Evidence*, *Approval*) with version tags and entity counts. Standard clients can activate or deactivate these items themselves, which bypasses licensing boundaries and can break database dependencies.

### Codebase Findings
*   **Navbar Linking**: In [layout.tsx](file:///d:/Code/verity/src/app/(shell)/layout.tsx#L90), the `/capabilities` path is linked globally inside the client shell sidebar:
    ```typescript
    { href: "/capabilities", label: "Capability registry", icon: "capabilities" as const }
    ```
*   **Lack of Licensing Gating**: There is no check verifying if the active membership belongs to the platform operator tenant before rendering `/capabilities`. The tenant's configuration view exposes these database-level capabilities directly.

---

## Issue 3: Activated Modules Do Not Appear in Navbar or Workspace

### The Issue
Even after selecting and activating a module, it fails to show up in the client’s navigation bar or workspace dashboard.

### Codebase Findings
*   **RBAC Filter Guard**: The navigation builder ([contribution.ts](file:///d:/Code/verity/src/server/platform/contribution.ts#L191-L193)) checks if the active user's role has explicit `Read` permissions for the entity required by that navigation item:
    ```typescript
    if (item.requiresEntity && !args.canRead(item.requiresEntity, item.requiresVerb ?? "Read")) {
      continue;
    }
    ```
*   **No Auto-Seeding**: The activation action only registers the capability activation in `TenantActivation`. It does not automatically grant the appropriate permissions to the client's admin group. Because the client admin's role lacks a `Read` permission for the newly activated capability's entities, the layout engine hides it from the sidebar.

---

## Issue 4: Permissions Configuration is Developer-Oriented and Highly Fragile

### The Issue
The Roles panel requires the operator or client admin to type database entity class names (e.g., `verity.platform.membership` or `verity.asset.asset`) in a text field. A single typo fails silently and breaks the user's access rights.

### Codebase Findings
*   **Raw Entity Binding**: The form in `/clients/[tenantId]/roles` writes directly to the `permission` table. It does not map friendly UI elements (like checkboxes or app-level switches) to database strings. It expects the administrator to know the exact namespaces and names of the entity definitions registered in the metadata catalog.

---

## Issue 5: Settings Keys Display Raw Code-Level Strings

### The Issue
The client’s `/configuration` and `/settings` screens present settings parameters using database keys (e.g., `verity.plywood.tax.cgst_rate_bp`), making it difficult for business users to know what they are configuring.

### Codebase Findings
*   **Metadata Direct Render**: The settings view pulls schemas directly from the `ConfigParameter` or `CustomFieldSchema` tables and prints the key property directly in the UI. There is no translation mapper to convert system identifiers into human-readable field labels (e.g., *CGST Tax Rate (%)*).
