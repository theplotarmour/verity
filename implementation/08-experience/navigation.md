# Navigation Architecture

## Purpose
Defines the navigation structures, routing state management, and interaction paradigms tailored to each specific experience shell.

## Scope
Includes sidebar navigation, bottom tab bars, breadcrumbs, deep linking strategies, and auth-protected route management. Excludes specific page content.

## Authority
- Bible V4 - Experience Shells, Workspaces & UX Law
- Next.js 16 App Router: EXISTING INFRASTRUCTURE

## Prerequisites
- Shell architecture route groups configured.
- Authentication provider established.

## Specification Requirements
- **WHAT MUST EXIST:** Tailored navigation models per user persona:
  - HQ/Owner Shells require high-density, multi-level structural navigation (Sidebars).
  - Worker Shell requires low-density, highly accessible navigation (Bottom Tabs).
  - B2C Portal requires frictionless, minimal navigation focused on conversion/completion.
- **WHAT MUST EXIST:** Contextual breadcrumbs for nested hierarchical resources.
- **WHAT MUST EXIST:** Support for deep linking directly to specific resources (e.g., a specific work order).

## Approved Architecture
- **Routing Paradigm (Authority: EXISTING INFRASTRUCTURE):** Next.js App Router for server-centric routing with client-side transitions.
- **Desktop Navigation (Authority: Bible V4):** Collapsible/Expandable Sidebar for `(hq)` and `(owner)` mapped to nested layout files.
- **Mobile Navigation (Authority: Bible V4):** Fixed Bottom Tab Bar for `(worker)` mapping to primary actionable views ('My Day', 'Tasks', 'Messages').
- **Auth Protection (Authority: Bible V1):** Middleware-based route protection verifying session tokens before rendering route groups.

## Implementation Contract
- Implement standard Server Components for Sidebars fetching user contextual links.
- Utilize Next.js `Link` with `prefetch={true}` (default) for primary shell transitions, but evaluate prefetch payload size.
- Construct a deterministic Breadcrumb component that derives its path from active Next.js segments (`useSelectedLayoutSegments`).
- Store ephemeral UI navigation state (like expanded sidebar folders) in URL search parameters or `localStorage`, NOT in global React state.

## Constraints & Invariants
- **PRN-001:** Least Surprise / Explainable Automation - Navigation structures must accurately reflect the user's permission boundaries; do not show links that lead to 403s.
- **INV-001:** Strict Tenancy Isolation - Navigation must not cross-link to or expose paths from unauthorized tenants.

## Dependencies
- Depends on: Next.js Router, Authentication Context.
- Depended on by: Shell Layouts, deeply nested pages.

## Failure Modes
- **Stale Navigation State:** Client-side cache holds outdated route data after a mutation. Mitigate using `revalidatePath` on server actions.
- **Deep Link Auth Failure:** Unauthenticated users clicking deep links lose their destination after login. Mitigate by storing `redirectTo` parameters in the Auth middleware.

## Testing Requirements
- E2E testing of authentication redirect loops.
- Accessibility tests on Sidebar keyboard navigation and Bottom Tab touch targets.

## Conformance Checks
- Verify `(worker)` navigation exclusively uses bottom tabs without nested sidebars.

## Traceability
- Bible V4 - Experience Shells

## Open Decisions
- None.
