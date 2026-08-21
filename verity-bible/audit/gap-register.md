# VERITY BIBLE GAP REGISTER
## Official Tracker for Constitutional and Architectural Gaps

Every gap identified in the Verity Master Bible must be tracked here. Gaps cannot be deleted; they must be resolved with clear rationales.

---

## 1. Active Gap Register

### `GAP-001` — Work Primitive Schema Model
*   **Status:** `RESOLVED`
*   **Remediation:** Volume II, Section 2 has been rewritten with the full 17-point structural checklist for the `Work` primitive.
*   **Affected Concepts:** `Work`, `SLA`, `Assignment`, `Evidence`.
*   **Implementation Implication:** Forces all work-execution models to use a single schema pattern in database tables.

### `GAP-002` — Party vs. User vs. Resource Decoupling
*   **Status:** `RESOLVED`
*   **Remediation:** Volume II, Section 3 defines strict decoupling rules. A `Party` represents identity; `User` holds credentials; `Resource` maps scheduling capacity.
*   **Affected Concepts:** `Party`, `User`, `Resource`.
*   **Implementation Implication:** Prevents duplicate address/contact card synchronization bugs.

### `GAP-003` — Location Hierarchy Mapping
*   **Status:** `RESOLVED`
*   **Remediation:** Volume II, Section 2 (Location) defines multi-level parent-child location paths (Site $\rightarrow$ Zone $\rightarrow$ Bin).
*   **Affected Concepts:** `Location`, `Asset`.
*   **Implementation Implication:** Supports arbitrary nesting coordinates.

### `GAP-004` — SLA Clock States and Precedence
*   **Status:** `RESOLVED`
*   **Remediation:** Volume II, Section 2 (Work - SLA) defines start, pause, breach, and stop transitions.
*   **Affected Concepts:** `Work`, `SLA`, `Contract`.
*   **Implementation Implication:** Ensures SLA timing logic is run asynchronously based on state changes.

### `GAP-005` — Offline Sync Conflict Handling
*   **Status:** `RESOLVED`
*   **Remediation:** Volume V, Section 8 has been added to specify chronological replay, field-level last-write-wins, and conflict aborts.
*   **Affected Concepts:** `OfflineCommand`, `Work`.
*   **Implementation Implication:** Forces device mutations to queue local timestamps and provides structured server replay logic.
