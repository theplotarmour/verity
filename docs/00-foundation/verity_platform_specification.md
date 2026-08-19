# Verity Platform Specification

This specification serves as the single source of truth for the Verity Operating System. It defines the layout conventions, the composition model, the internal-only monorepo module framework, and the implementation guidelines.

---

## 1. Core Architecture Model

Verity is a modular platform built to assemble tailored operating systems for diverse business verticals (e.g., cafes, salons, clinics, field logistics) from reusable, core capabilities. 

### Internal Monorepo Module Framework (Simplification)
Verity does **not** expose a public-facing Developer SDK or module uploader. Development is strictly internal, team-driven, and managed directly within the central monorepo.
*   **No Packaging/Distribution Overhead:** All modules reside statically in `src/platform/modules/definitions/` and are registered in `src/platform/modules/registry.ts`.
*   **Static Type Checks:** Permissions, navigation items, and lazy-loaded dashboard widgets are validated at compilation time via TypeScript, avoiding runtime dynamic resolution risks.

### Composition Taxonomy
```text
MODULES (e.g. scheduling, crm) ──> CAPABILITIES ──> PACKS (e.g. lifestyle_services) ──> CLIENT WORKSPACE
```
1.  **Modules:** The building blocks declaring permissions, sidebar navigation routes, and dashboard widgets.
2.  **Packs:** Statically defined module bundles (e.g. `modern_qsr` includes core, menu, tables_orders, kitchen, serving, crm). Adopting a pack configures tenant entitlements instantly.
3.  **Client Workspace:** The runtime environment active for a specific tenant organization, styled according to their vertical pack.

---

## 2. Design System: Clean Minimal Glassmorphism

Verity uses a premium, highly responsive glassmorphic surface language that is identical in both light and dark modes.

### Surface Treatment (`.verity-glass`)
*   **Frosted Glass Backdrop:** Applied globally using `backdrop-filter: blur(20px) saturate(140%)` for both light and dark themes. Opaque paper backgrounds are avoided.
*   **Theme Tokens:**
    *   **Light Mode:** Translucent white backgrounds (`rgba(255, 255, 255, 0.65)`) paired with thin silver borders (`#AEAEB8` or `rgba(0, 0, 0, 0.06)`) and subtle drop shadows.
    *   **Dark Mode:** Translucent charcoal backgrounds (`rgba(255, 255, 255, 0.035)`) paired with thin steel borders (`rgba(255, 255, 255, 0.26)`) and soft deep-shadow elevation.
*   **Contrast Safety (WCAG 1.4.11):** All card borders and interface controls must maintain a minimum contrast ratio of 3:1 against their backdrops. Card outline borders must maintain at least 2:1 contrast.

### Layout Geometry
*   **High Radii:** All cards, dialog sheets, and main panels must use `rounded-[24px]` or `rounded-[32px]`. Inputs and controls use `rounded-[16px]` or `rounded-full`.
*   **Symmetric stretch (`items-stretch`):** Adjacent cards in dashboard grids must stretch to equal height.
*   **Bounded Viewports:** Avoid global page scrollbars. Bounding main components to standard viewport heights (e.g. `h-[520px]`) and using independent inner container scrolling (`overflow-y-auto`) is mandatory.

---

## 3. The Four Worlds UX Shells

The client front-end is divided into four context-isolated shells:

1.  **Customer Shell (Mobile-First):** White-labeled discoverability. Focuses on booking slots (`/book`) and ordering from menus (`/menu`).
2.  **Employee Shell (Action-First):** Simplified floor operations. Focuses on tasks (`/worker/my-day`), rosters (`/worker/schedule`), and preparation display queues (`/worker/kds`).
3.  **Owner Shell (Command Center):** Tactical management. Focuses on metrics dashboards (`/owner/dashboard`), alert centers, schedules, and billing controls.
4.  **HQ Admin Shell (Control Plane):** Global portfolio governance. Focuses on tenant MRR, module toggles, and system template definitions (`/verity/*`).

---

## 4. Operational Execution Roadmap

1.  **Phase 1: Design System (Completed):** Integrated the unified light/dark glassmorphic variables, floating app shell panels, and `.verity-glass` cards.
2.  **Phase 2: Role Shells:** Segregating the routes cleanly into Customer, Employee, and Owner layouts.
3.  **Phase 3: Event Engine:** Wiring the prisma event bus to automatically trigger downstream actions (e.g. `booking.completed` -> `billing.trigger`).
4.  **Phase 4: Restaurant OS:** Building interactive, draggable floor layout grids and KDS bump stations.
5.  **Phase 5: Lifestyle OS:** Implementing staff booking utilization schedules and walk-in check-in queues.
6.  **Phase 6: HQ Control:** Enhancing portfolio-level billing trackers and provisioning templates.
