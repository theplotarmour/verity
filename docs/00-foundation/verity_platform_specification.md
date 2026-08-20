# Verity Platform Specification

This specification serves as the single source of truth for the Verity Operating System. It defines the platform's core architecture, compositional system builder model, dynamic layout conventions, and the role-specific experience layers.

---

## 1. Platform Core Definition

> **Verity is not a multi-module ERP where modules are independently enabled. Verity is a configurable business-system construction platform where reusable capabilities, workflows, roles, interfaces and data models are composed into client-specific operating systems. A module is only complete when its business lifecycle, role-specific experiences, permissions, events, workflows, dashboard capabilities and integrations are defined. Packs are preconfigured compositions of these capabilities, and every client system is dynamically generated from that composition.**

### Streamlined Development Model (No External SDK)
Verity does **not** support external developers or a third-party SDK uploader. Development is managed strictly within the primary monorepo by the core team.
*   **Static Definition & Registration:** Modules are defined in `src/platform/modules/definitions/` and registered in `src/platform/modules/registry.ts`.
*   **Zero-Boilerplate Configuration:** New capabilities contribute directly to core data tables and RBAC structures without modifying shared layout pages.

---

## 2. Dynamic Workflow Composition Engine

Capabilities in Verity do not exist as isolated CRUD pages. They must compose into continuous, multi-module business workflows coordinated by the **Decoupled Event Bus** (`src/platform/events/bus.ts`).

### Vertical Packs

Three packs are active. They are the only valid pack keys; anything else is a
retired key that `resolvePackKey()` maps forward onto one of these.

| Key | Vertical |
| --- | --- |
| `facility_management` | Multi-site cleaning, security and maintenance |
| `franchise_qsr` | Quick-service restaurant franchise networks |
| `franchise_retail` | Retail franchise store networks |

`booking` and `crm` belong to no pack. They are composition modules, enabled per
tenant from the HQ builder.

`auto_components` was a fourth pack, bundling `manufacturing` and `automotive`.
The MES layer underneath it — blueprints and routing, production plans, work
orders, job cards, stage capture, the BOM and spec engines — was withdrawn, and
those modules with it. The key maps forward to `franchise_retail` in
`RETIRED_PACKS`, because what survives for such a tenant is a catalogue, stock
and orders. `ItemMaster` became `Product`: an item catalogue is not MES, a bill
of materials is.

### Reference Composition Flows

The chains below are declared once in `src/platform/events/workflows.ts`, wired
in `src/platform/events/reactions.ts`, and asserted by `reactions.test.ts` — a
flow named here without a listener behind it fails a test. Every reaction scopes
its own queries by `factoryId`, checks its own module entitlement, and is
idempotent, so a partially entitled tenant runs the steps it owns and silently
skips the rest.

Publishing goes through `publish()` (`src/platform/events/publish.ts`), which
registers reactions lazily and never throws into the caller.

#### 1. Service Day
For appointment-based services:
```text
Booking (appointment served)
       │
       ▼ (Event: appointment.completed)
Billing (draft invoice raised for the visit)
CRM     (client spend profile updated)
Core    (owner notified the client was served)
```

#### 2. Field Maintenance
For property management and field service operations:
```text
Helpdesk (ticket raised)
       │
       ▼ (Event: ticket.created)
Helpdesk (job dispatched to a technician)
       │
       ▼ (Event: work_order.dispatched)
Helpdesk (visit completed on site)
       │
       ▼ (Event: work_order.completed)
Assets  (condition ledger updated)
Billing (draft invoice raised for the visit)
```

Reactions to a single event are independent listeners, not a sequence: each one
is isolated and best-effort, so a failure in one cannot stop another.

---

## 3. Generative Role-Specific UX Layer (The Four Worlds)

The client experience is not a generic layout with toggled menu buttons. The UI is dynamically generated from the active pack composition, presenting unique interfaces to each of the **Four Worlds**:

### World 1: Customer (Mobile-First White-Label)
*   **Purpose:** Discovery, visual menus, slots, and transactions.
*   **Design:** Wholly white-labeled with client-defined colors (`--brand` accent) and asset logos.
*   **Key Views:** `/book` (slot selector) and `/my-bookings` (status & reschedule options).

### World 2: Employee (Action-First Deskless)
*   **Purpose:** Frictionless shift execution. Zero business analytics, zero layout choices.
*   **Design:** Large, touch-friendly bump buttons and compact lists formatted for floor tablets or mobile viewports.
*   **Key Views:** `/worker` (clock-in/out, task sheets), `/worker/schedule`, `/worker/stage` and `/worker/inspection`.

### World 3: Manager / Owner (Operational Command Center)
*   **Purpose:** Resource allocation and exception handling.
*   **Design:** Dense metrics dashboard with symmetric, stretchable grids and scroll-bounded panels. Includes the **Attention Section** for anomalous event notifications.
*   **Key Views:** `/owner/dashboard` and `/owner/settings` (modular controls).

### World 4: Verity HQ Admin (Control Plane System Builder)
*   **Purpose:** Dynamic workspace generation and deployment.
*   **Design:** A visual control room for constructing client operating environments. Implemented at `/verity/clients/[id]`; deployment runs through `deployTenantConfig()` in `src/server/actions/hq.ts`, guarded by `requireHqAction()` and audit-logged.
    ```text
    [HQ System Builder Console]

    CLIENT ORG: AlienKind Cafe

    1. Active Modules:  [✓] Core  [✓] HR  [✓] Billing  [✓] Sites
    2. Workflows:       Service day — complete | Field maintenance — partial (assets off)
    3. Role Matrix:     Owner · Manager · Worker (users and permissions per role)
    4. Brand Identity:  Logo: alien_logo.png | Accent: #00FFCC | Domain: alienkind.verity.ai

    [ Deploy Config to Tenant ]
    ```
*   **Workflow panel:** reads `workflowStatus()` against the selected module set, so the console shows which chains a selection actually lights up and where each one stops. It cannot advertise a chain the bus does not run.
*   **Brand identity:** accent colour is rejected unless it matches `/^#[0-9a-fA-F]{6}$/` — the value is written into a `style` attribute.

---

## 4. Design & Glassmorphism Guidelines

All interfaces must respect the unified glassmorphism system:
*   **Surface:** `.verity-glass` cards with `backdrop-filter: blur(20px)` active on both light (`rgba(255,255,255,0.65)`) and dark (`rgba(255,255,255,0.035)`) modes.
*   **Geometry:** High corner rounded profiles (`rounded-[24px]` / `rounded-[32px]`) for structural panels.
*   **Contrast Safety:** Controls must clear the WCAG 3:1 contrast floor, while decorative card borders must remain visible (contrast ratio of 2:1 or higher).
