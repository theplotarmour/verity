# VERITY SCENARIO TESTING REGISTRY
## Stress-Testing Core Primitives against Real-World Operations

This document records the results of stress-testing Verity’s canonical model against 15 complex service-business scenarios.

---

## 1. Scenario Stress Tests

### Scenario A: Multi-branch organization with shared assets
*   **Concepts Involved:** `Location`, `Asset`, `Resource`, `Schedule`.
*   **Expected Behavior:** A buffer machine (Asset) belonging to Branch A is scheduled at Branch B. The scheduling engine locks the Asset's `Resource` capacity profile globally across Branch A and Branch B calendars, blocking overlapping allocations.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume II, Section 2 (Location and Asset mapping).

### Scenario B: Subcontractor workforce
*   **Concepts Involved:** `Party`, `Resource`, `User`, `TenantMembership`.
*   **Expected Behavior:** A subcontractor guard executes patrols. The guard is a `Party` containing a user login. Their `Resource` scheduling capacity maps to a subcontractor Vendor `Party` profile for aggregate billing payouts.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume II, Section 2 (Party and Resource mapping).

### Scenario C: Emergency cancellation during execution
*   **Concepts Involved:** `Work`, `SLA`, `Event`, `Evidence`.
*   **Expected Behavior:** AC repair is cancelled midway. State shifts to `Cancelled`. The transition emits `work_order.job.cancelled`. The billing engine consumes the event, checks the uploaded checklists and photo `Evidence` up to the cancellation timestamp, and drafts partial charges.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume III, Section 3 & 5.

### Scenario D: One Request → multiple Work items
*   **Concepts Involved:** `Request`, `Work`.
*   **Expected Behavior:** An intake facility inspection `Request` is approved, spawning three separate committed `Work Orders` (Electrical check, Plumbing audit, Fire safety test) tracked under a parent project.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume II, Section 2 (Work and Request mapping).

### Scenario E: Multiple Requests → coordinated Work
*   **Concepts Involved:** `Request`, `Work`.
*   **Expected Behavior:** Three client requests for adjacent site cleanings are consolidated by a scheduler into a single coordinated `Work Order` route to optimize resource travel.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume II, Section 2 (Request mapping).

### Scenario F: Worker reassignment during execution
*   **Concepts Involved:** `Resource`, `Work`, `Assignment`, `Audit Record`.
*   **Expected Behavior:** A technician breaks down mid-job. The dispatcher runs `reassign`. The active `Work Order` assignment changes to a new technician. The state remains `In-Progress`, and the transition, timestamp, and new resource mapping are logged in `Audit Record`.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume III, Section 3.

### Scenario G: SLA breach while work is offline
*   **Concepts Involved:** `Work`, `SLA`, `OfflineCommand`.
*   **Expected Behavior:** A worker completes a job offline at 14:00 (before SLA deadline 14:15), but syncs at 14:30. The server processes the physical device check-in timestamp (14:00) to evaluate SLA compliance, logging it as "On Time" despite the delayed server receipt.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume V, Section 8.

### Scenario H: Approval rejected after work has started
*   **Concepts Involved:** `Approval`, `Work`, `Exception`.
*   **Expected Behavior:** An auditor rejects an active elevator repair approval mid-execution. The `Work Order` is immediately paused, moving state to `Draft` (or safety lock), notifying the dispatcher and logging the reject exception.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume III, Section 5.

### Scenario I: Resource becomes unavailable after assignment
*   **Concepts Involved:** `Resource`, `Work`, `Exception`.
*   **Expected Behavior:** A guard goes on emergency leave. Their `Resource` capacity is set to `Inactive`. The scheduling engine automatically flags all their future assigned shifts as `Unstaffed` and alerts dispatchers.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume III, Section 3.

### Scenario J: Customer changes requirements mid-execution
*   **Concepts Involved:** `Work`, `Contract`, `Configuration`.
*   **Expected Behavior:** Customer adds tasks to an active AC service. Schedulers update the `Work Order` checklist properties (using dynamic JSONB extensions), modifying the target SLA and pricing values based on updated contract rates.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume II, Section 3.

### Scenario K: Two supervisors modify the same Work concurrently
*   **Concepts Involved:** `Work`, `Concurrency`.
*   **Expected Behavior:** Two managers edit shift details simultaneously. The server implements database optimistic locking (using version tokens). The second write is rejected with `E_CONFLICT`, prompting the user to refresh.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume III, Section 1.

### Scenario L: Work is completed but evidence arrives later
*   **Concepts Involved:** `Work`, `Evidence`, `OfflineCommand`.
*   **Expected Behavior:** A worker completes a job offline and check-in evidence is queued. The work is marked `Pending-Verification` server-side, but the verification sign-off is gated until all queued offline media files are uploaded and validated.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume V, Section 8.

### Scenario M: External integration repeats the same event
*   **Concepts Involved:** `Event`, `Idempotency`.
*   **Expected Behavior:** An external payment webhook triggers twice for invoice #101. The billing connector checks the unique event ID, recognizes it as processed, and returns `200 OK` without creating duplicate payments.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume V, Section 3.

### Scenario N: Organization restructures into new branches
*   **Concepts Involved:** `Location`, `Organization`.
*   **Expected Behavior:** Company splits Noida site into Noida-East and Noida-West. The system updates the Location parent-child mappings. Past work records retain their historical coordinates and site tags, while new work is scheduled under the new branches.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume II, Section 2 (Location mapping).

### Scenario O: Existing workflow is changed for future work while historical work retains old rules
*   **Concepts Involved:** `Workflow`, `Versioning`.
*   **Expected Behavior:** The checklist steps for inspections are updated. In-flight work orders execute under the checklist schema snapshot active at creation, while new work orders instantiate the new template version.
*   **Status:** `PASS`
*   **Bible Coverage:** Volume V, Section 7.
