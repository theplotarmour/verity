# Architecture Manifesto

Verity is designed from the ground up as a **business-system construction platform** rather than a traditional monolithic or multi-tenant ERP. This manifesto documents the structural guidelines that keep the codebase modular, decoupled, and maintainable.

---

## 1. Composable Module Pattern

All features in Verity belong to a self-contained module. Modules do not share views, routes, or database operations directly without explicit contracts.

```text
              [ Module Registry ]
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
[ Core Module ]   [ CRM Module ]   [ Booking Module ]
  - Entitlements    - Customers      - Calendar slots
  - RBAC checks     - Spend profiles - Appointments
```

### Static Registrations
*   Verity has **no runtime package installation** and **no external Developer SDK**.
*   All modules are defined under `src/platform/modules/definitions/` and statically registered in `src/platform/modules/registry.ts`.
*   A module's definition declares:
    1.  **Entitlements:** Unique key (e.g. `booking`, `billing`) and dependencies on other modules (`requires`).
    2.  **Navigation:** Paths contributed to the owner sidebar or top config bar.
    3.  **Permissions:** Key names namespaces as `<subject>.<verb>` (e.g. `billing.create_invoice`).
    4.  **Dashboard Widgets:** Metric or panel components loaded dynamically.

---

## 2. Decoupled Event Bus Workflows

To prevent modules from hardcoding dependencies into each other (cross-module leakage), all cross-domain operations run through the **Decoupled Event Bus** (`src/platform/events/bus.ts`).

```text
[ Booking Module ] ──(appointment.completed)──> [ Event Bus ]
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           ▼                                                       ▼
                [ Billing Reaction ]                                     [ CRM Reaction ]
         Generates Draft Service Invoice                          Updates Customer Spend Profile
```

### Composition Rules
1.  **Ignorant Publisher:** A module publishes an event when a business milestone is achieved (e.g., `appointment.completed`, `ticket.created`). The publisher does not know or care who listens to it.
2.  **Isolated Listener:** Reactions are registered in `src/platform/events/reactions.ts`. A reaction is a best-effort, asynchronous handler. If one reaction fails, it must not interrupt the execution of other reactions.
3.  **Idempotence:** Because events can be delivered multiple times, every reaction that writes to the database must verify if it has already processed the event before committing new records.

---

## 3. Tenancy & Isolation Scoping

Verity enforces absolute tenant isolation at the data layer. 

*   **Boundary Rule:** All database operations inside actions, routes, and reaction handlers must scope queries strictly by `factoryId` (which identifies a specific client site/outlet) or `organizationId` (which identifies the client enterprise tenant).
*   **Leak Prevention:** It is a violation of Verity architecture for a query to search globally across the database without mapping to a specific tenant context.
