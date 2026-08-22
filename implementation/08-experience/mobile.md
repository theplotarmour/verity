# Mobile Worker Shell Experience

## Purpose
Defines the specialized user experience, layout constraints, and offline-first behaviors required for the Worker Shell serving frontline deskless staff.

## Scope
Mobile-first layouts, touch targets, offline synchronization UX, evidence capture integrations, PWA capabilities.

## Authority
- Bible V4 - Experience Shells (Worker Shell CONSTITUTIONAL)
- CONSTITUTIONAL (Offline UX)
- EXISTING INFRASTRUCTURE (Serwist for PWA)

## Prerequisites
- Next.js route group `(worker)` established.

## Specification Requirements
- **WHAT MUST EXIST:** Single-column layout optimized for mobile viewports.
- **WHAT MUST EXIST:** Minimum 48px tap targets for all interactive elements.
- **WHAT MUST EXIST:** 'My Day' landing screen showing immediate assignments.
- **WHAT MUST EXIST:** Instant optimistic local mutations and persistent 'Working Offline' banner during disconnected states.
- **WHAT MUST EXIST:** Background silent sync on network reconnection.

## Approved Architecture
- **Layout (Authority: Bible V4):** Fixed bottom tab navigation, full-width stacked cards, no horizontal scrolling data tables.
- **PWA Capabilities (Authority: EXISTING INFRASTRUCTURE):** Serwist configured to cache app shell assets and intercept network requests.
- **Offline Data (Authority: Spec REQ-DATA-OFFLINE):** Store critical read-data in `IndexedDB` (via localForage or raw API). Queue outgoing commands in a local mutation queue.

## Implementation Contract
- Enforce `min-h-[48px] min-w-[48px]` and `p-4` spacing globally within the `(worker)` route group.
- Implement a global network listener hook (`useNetworkStatus`).
- Render a highly visible 'Working Offline' banner fixed at the top of the viewport when `navigator.onLine` is false, displaying the count of pending mutations.
- Implement the 'My Day' screen as the default route (`/app`), pulling assigned tasks filtered by `assignedTo = currentUser` and `status != COMPLETED`.
- Integrate native device capabilities via HTML5 APIs for Evidence Capture (camera `<input type="file" accept="image/*" capture="environment">`).

## Constraints & Invariants
- **CONSTITUTIONAL:** Worker Shell must never utilize extreme data density tables.
- UI must remain entirely unblocked during background synchronization.

## Dependencies
- Depends on: PWA configuration, IndexedDB, Network API.
- Depended on by: Field operations, Evidence upload.

## Failure Modes
- **Sync Conflict:** Offline mutation conflicts with server state upon reconnection. Mitigate by implementing last-write-wins or marking the entity with a "Sync Failed - Review Required" status.

## Testing Requirements
- E2E testing using browser offline mode simulation to verify optimistic updates and queue persistence.
- Lighthouse testing for PWA installability and tap target sizes.

## Conformance Checks
- Scan `(worker)` components for missing 48px touch targets on buttons and links.

## Traceability
- Bible V4
- REQ-DATA-OFFLINE-001->003

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** specific local storage wrapper library for IndexedDB (e.g., `idb`, `localforage`, or custom wrapper).
