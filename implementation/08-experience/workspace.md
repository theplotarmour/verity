# Workspace & Context Architecture

## Purpose
Governs how users interact with their working context, including tenant/organization switching, multi-pane layouts, and responsive workspace organization.

## Scope
Organization context switching, pane managers, split views, full-screen interaction modes. Excludes underlying data fetching.

## Authority
- Bible V4 - Experience Shells, Workspaces & UX Law
- PRN-002: Progressive Disclosure of Complexity

## Prerequisites
- Bounded viewports configured in Shell Architecture.
- Active user session with tenancy claims.

## Specification Requirements
- **WHAT MUST EXIST:** Explicit organization/tenant context switching for users belonging to multiple tenancies.
- **WHAT MUST EXIST:** Multi-pane views for the Owner Shell (e.g., dispatch board side-by-side with resource calendars).
- **WHAT MUST EXIST:** Full-screen execution views for the Worker Shell (focus mode for task execution).

## Approved Architecture
- **Context Management (Authority: Bible V5 / Spec PLA-TEN):** Context is derived from URL paths (e.g., `/[tenantId]/...`) or a verified session claim. URL pathing is preferred for shareable state.
- **Multi-Pane Layout (Authority: Bible V4):** Use CSS Grid (`grid-cols-*`) and Flexbox (`flex-1`) with independent `overflow-y-auto` scroll containers to achieve multi-pane dashboards in `(owner)`.
- **Responsive Behavior (Authority: AGENTS.md):** `items-stretch` must be used on column-based layouts to ensure uniform pane heights.

## Implementation Contract
- Build a Organization Switcher component that transparently triggers a hard navigation or full state reset upon switching to prevent cross-tenant data leakage in client cache.
- For Owner Shell, implement Resizable Panes (e.g., utilizing `react-resizable-panels` if added, or standard CSS Grid fractions) that allow users to adjust the split between lists and detail views.
- For Worker Shell, build standard full-viewport modals/overlays for task execution that hide the bottom navigation to maximize screen real estate.

## Constraints & Invariants
- **INV-001:** Strict Tenancy Isolation. A workspace must never render data from multiple tenants simultaneously.
- **CONSTITUTIONAL:** Viewports must remain bounded (no outer scroll). Panes must scroll internally.

## Dependencies
- Depends on: Core routing, Tenancy identifiers.
- Depended on by: Feature modules (Dispatch, Work Orders).

## Failure Modes
- **Cache Contamination on Switch:** Client-side cache retains entity list from Tenant A after switching to Tenant B. Mitigate by using `router.refresh()` or explicit cache invalidation on context switch.

## Testing Requirements
- Test organization switching while maintaining the current deep-linked entity (if it exists in the new tenant) or gracefully falling back to dashboard.
- Validate internal scrolling mechanisms of multi-pane views.

## Conformance Checks
- Ensure multi-pane grids use `items-stretch`.
- Ensure main app container is `overflow-hidden`.

## Traceability
- Spec PLA-TEN-001->006

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Selection of a resizable pane library (if required for the Owner shell dispatch view) or reliance on static percentage grids.
