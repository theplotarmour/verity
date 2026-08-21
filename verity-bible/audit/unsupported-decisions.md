# VERITY DECISIONS & AUTHORITY CLASSIFICATION REGISTER
## Mapping Bible Claims to Verified Sources of Authority

This document registers all significant design decisions in the Verity Master Bible and classifies their source of authority.

---

## 1. Decisions Register

### `DEC-001` — Row-Level Security Tenancy Isolation
*   **Statement:** Tenant data isolation must be enforced at the database level.
*   **Classification:** `PROPOSED`
*   **Source:** Multi-tenancy isolation is a core requirement (`FACT`), but using RLS as the default mechanism is a proposed architectural implementation.

### `DEC-002` — Geofenced Clock-in Compliance
*   **Statement:** Workforce check-ins are restricted to a Location's geofenced boundary.
*   **Classification:** `PROPOSED`
*   **Source:** This is a proposed design choice. Since some service organizations have travel-based or off-site roles, this must be a tenant-configurable policy rather than a platform invariant.

### `DEC-003` — Elimination of Kitchen Module & KDS
*   **Statement:** KDS bump queues and preparation timers are excluded from the platform scope.
*   **Classification:** `DECIDED`
*   **Source:** User explicitly stated: *"The kitchen module was withdrawn."*

### `DEC-004` — Digital Menu External Ingestion Checkout
*   **Statement:** Digital menu portals post orders directly to `ingestExternalOrder` as a `DRAFT` `SalesOrder`.
*   **Classification:** `DECIDED`
*   **Source:** User explicitly stated: *"Menu checkout posts to ingestExternalOrder, not 'the active table order'. tables_orders was withdrawn; that path already books a DRAFT SalesOrder and enqueues ORDER_RECEIVED in one transaction."*

### `DEC-005` — Dynamic Catalog Excluded from Standard Packs
*   **Statement:** The catalog module is enabled per tenant and excluded from standard QSR/Retail packs.
*   **Classification:** `DECIDED`
*   **Source:** User explicitly stated: *"catalog is in no pack... repring two live packs is your decision... so it's HQ-enabled per tenant."*

### `DEC-006` — Offline Command Reconciliation
*   **Statement:** Reconnection synchronization uses chronological replay and field-level last-write-wins with manual conflict gates.
*   **Classification:** `PROPOSED`
*   **Source:** Proposed synchronization strategy to handle real-world disconnects without silent database corruption.
