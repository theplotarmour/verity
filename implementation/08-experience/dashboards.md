# Dashboard & Widget Patterns

## Purpose
Defines the implementation of operational dashboards, KPI widgets, and real-time visualization panels tailored to user roles.

## Scope
KPI widgets, charts, real-time diagnostic panels, bottleneck visualization.

## Authority
- Bible V4 - Experience Shells
- PRN-001: Least Surprise

## Prerequisites
- Layout and workspace multi-pane structures defined.

## Specification Requirements
- **WHAT MUST EXIST:** Distinct dashboards for each shell type (HQ Diagnostics vs Owner Bottlenecks vs Worker 'My Day').
- **WHAT MUST EXIST:** Real-time or near real-time updates for critical operational KPIs.
- **WHAT MUST EXIST:** Visual distinction of performance statuses based on semantic colors.

## Approved Architecture
- **Data Fetching (Authority: EXISTING INFRASTRUCTURE):** Initial payload via Next.js Server Components.
- **Widget Composition (Authority: Bible V4):** Grid layouts composing independent, specialized Server Components (e.g., `<ActiveWorkOrdersWidget />`, `<RevenueWidget />`).
- **Data Visualization:** Rely on HTML/SVG or minimal charting libraries, ensuring adherence to the strict brand palette and flat styling (no gradients, no glass).

## Implementation Contract
- Implement a Dashboard Grid component utilizing standard CSS Grid with responsive column adjustments.
- For Owner Shell, implement Bottleneck KPI widgets that highlight stages in a workflow where SLAs are at risk, applying the Yellow/Red visual semantics.
- For Worker Shell, 'My Day' is the primary dashboard, constructed as a sequential list of assignments rather than analytical widgets.

## Constraints & Invariants
- **CONSTITUTIONAL:** Must adhere to Visual Color Semantics (Red=Breached, Yellow=Pending/Warning, Green=Verified, Blue=Active).
- Widgets must fail gracefully. If one widget fails to load data, it must not crash the entire dashboard page (use React `<Suspense>` boundaries per widget).

## Dependencies
- Depends on: Domain aggregation queries.
- Depended on by: Default shell routes.

## Failure Modes
- **Dashboard Load Timeout:** Aggregation queries take too long, blocking page render. Mitigate by wrapping every KPI widget in its own `<Suspense>` boundary with a skeleton fallback.

## Testing Requirements
- Test fallback skeleton rendering using artificial delay in Server Components.
- Verify exact color codes match the semantic specification.

## Conformance Checks
- Check that Dashboard grids do not use `items-start` on column layouts.

## Traceability
- Bible V4 - Experience Shells

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Approach for real-time updates. Options: Client-side polling (SWR/React Query), Server-Sent Events (SSE), or WebSockets. Polling is recommended for initial simplicity.
- **IMPLEMENTATION DECISION REQUIRED:** Charting library selection (e.g., Recharts, Visx, or raw SVGs) that allows strict adherence to the brand color palette.
