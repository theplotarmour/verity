# Data Table Patterns

## Purpose
Standardizes the display, pagination, and interaction of tabular data across the varying density requirements of the platform shells.

## Scope
Data grids, server-side pagination, sorting, filtering, and row-level actions. Excludes static lists.

## Authority
- Bible V4 - Experience Shells (Data Density)
- Next.js 16 App Router: EXISTING INFRASTRUCTURE

## Prerequisites
- Component library primitives for tables, dropdowns, and pagination controls.

## Specification Requirements
- **WHAT MUST EXIST:** Server-side pagination and sorting bound to tenant-filtered queries.
- **WHAT MUST EXIST:** Density variations: HQ Console requires extreme data density; Owner Shell requires moderate density; Worker Shell prefers cards/lists over tables.
- **WHAT MUST EXIST:** Row-level actions mapped directly to domain Commands.

## Approved Architecture
- **State Management (Authority: EXISTING INFRASTRUCTURE):** Pagination, sorting, and filtering state MUST be driven by URL search parameters (`?page=2&sort=createdAt:desc`). This ensures shareability and server-side rendering capability.
- **Data Fetching (Authority: EXISTING INFRASTRUCTURE):** React Server Components fetch data directly from Prisma, utilizing URL search parameters for arguments.
- **Styling (Authority: Bible V4):** Use standard Tailwind classes, adjusting `padding` to control density (`p-1` for HQ, `p-3` for Owner).

## Implementation Contract
- Build a generic Server Component wrapper that parses URL `searchParams`, executes the Prisma query with `skip`/`take`, and passes data to a Client Component for rendering if interactivity (like column resizing) is needed, otherwise keep it Server-rendered.
- Map row actions (e.g., "Approve", "Cancel") to Server Actions via small form buttons or a context menu dropdown.
- Exclude Tables entirely from the Mobile Worker Shell in favor of stacked card lists to maintain the 48px tap target requirement and single-column layout.

## Constraints & Invariants
- **INV-001:** All table queries must enforce tenant isolation at the database layer (RLS or implicit Prisma `where` clauses).
- **CONSTITUTIONAL:** Tabular data must never trigger horizontal scrolling of the entire viewport; scroll the table container instead.

## Dependencies
- Depends on: Prisma queries, URL state.
- Depended on by: HQ Console, Owner Shell dashboards.

## Failure Modes
- **Deep Pagination Performance:** Using `skip` on very large datasets degrades performance. Mitigate by enforcing max page limits or switching to cursor-based pagination for high-volume logs.

## Testing Requirements
- E2E test sorting and filtering interactions via URL parameter updates.

## Conformance Checks
- Verify `(hq)` tables use condensed padding compared to `(owner)` tables.

## Traceability
- Bible V4 - Experience Shells

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Selection of a headless table utility (e.g., `@tanstack/react-table`) to manage complex column configurations and sorting logic.
