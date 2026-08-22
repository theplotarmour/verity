# Shell Architecture

## Purpose
Defines the high-level application shells that serve different user personas within the Verity platform, ensuring optimized experiences based on user context and environment.

## Scope
Includes the four core experience shells (HQ Console, Owner Shell, Worker Shell, B2C Portal), Next.js App Router structural boundaries, and global layout constraints. Excludes specific feature implementations within these shells.

## Authority
- Bible V4 - Experience Shells, Workspaces & UX Law (CONSTITUTIONAL)
- UX Constitution (CONSTITUTIONAL)
- AGENTS.md (Brand Palette & Grid constraints)
- EXISTING INFRASTRUCTURE (Next.js 16, React 19, Tailwind CSS v4)

## Prerequisites
- Next.js App Router base setup.
- Authentication context provider.
- Semantic CSS tokens initialized in Tailwind configuration.

## Specification Requirements
- **WHAT MUST EXIST:** Four role-centric experience shells must be provided:
  - **HQ Console:** For Superadmins. Extreme data density, tabular grids, diagnostics.
  - **Owner Shell:** For Business Managers. Multi-pane calendars, dispatch boards, bottleneck KPIs.
  - **Worker Shell:** For Frontline Deskless Staff. Mobile-first, single-column, minimum 48px tap targets, 'My Day' screen.
  - **B2C Portal:** For End Customers. Whitelabeled, frictionless, zero internal jargon.
- **WHAT MUST EXIST:** Bounded viewports with no outer page scrolling under 900px height; inner sub-panels must scroll independently.
- **WHAT MUST EXIST:** No translucent glassmorphism (solid high-contrast surfaces only).

## Approved Architecture
- **Framework Structure (Authority: EXISTING INFRASTRUCTURE):** Utilize Next.js 16 App Router Route Groups `(hq)`, `(owner)`, `(worker)`, `(portal)` to isolate layouts and navigation state without affecting the URL path where unnecessary, or mapping them to explicit base paths if required by tenancy/routing logic.
- **Styling constraints (Authority: Bible V4 CONSTITUTIONAL):** Strict enforcement of solid surfaces using `bg-surface` (`#FFFFFF` or `#1C1C1E`). No backdrop-blur or translucent backgrounds.
- **Brand Palette (Authority: AGENTS.md):** Scarlet `#FF102A`, Deep Red `#89001E`, Graphite `#1F2328`.
- **Layout Grids (Authority: AGENTS.md):** Flex/grid layouts must use `items-stretch` on columns, strictly avoiding `items-start` for structural consistency.

## Implementation Contract
- Implement Next.js `layout.tsx` files inside `app/(hq)`, `app/(owner)`, `app/(worker)`, and `app/(portal)`.
- Ensure the root layout or shell layouts apply `h-screen w-screen overflow-hidden` to enforce bounded viewports.
- Define scrollable regions explicitly within child components using `overflow-y-auto`.
- Do not use `@apply` in CSS for utility classes; rely on Tailwind utility classes in TSX or `clsx`/`tailwind-merge`.
- Apply minimum touch target classes (`min-h-[48px] min-w-[48px]`) within the `(worker)` layout primitives.

## Constraints & Invariants
- **INV-001:** Strict Tenancy Isolation (Ensure shell boundaries do not leak data across tenants).
- **CONSTITUTIONAL:** Glassmorphism is strictly banned.
- **CONSTITUTIONAL:** Bounded viewports must prevent full-page body scrolling on desktop shells.

## Dependencies
- Depends on: Auth session resolution to route users to their default shell.
- Depended on by: All application routes.

## Failure Modes
- **Routing Loop:** Incorrect role-to-shell mapping causes infinite redirects. Mitigate via strict state machine for session hydration.
- **Viewport Overflow:** Unconstrained content breaks bounded layout. Mitigate by enforcing `flex-1 min-h-0` on container wrappers.

## Testing Requirements
- Unit test route group layout rendering.
- Visual regression testing to verify bounded viewports (no body scrollbars).
- E2E test for role-based shell routing.

## Conformance Checks
- Verify absence of `backdrop-blur` or glassmorphic utilities in Tailwind.
- Verify `(worker)` shell buttons meet the 48px minimum touch target.

## Traceability
- Bible V4 - Experience Shells

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Design system component library (no shadcn, radix, or headlessui currently installed). Must decide if we build raw primitives or adopt an unstyled accessible library.
