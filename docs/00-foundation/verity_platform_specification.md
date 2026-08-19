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

### Reference Composition Flows

#### 1. Service/Lifestyle OS Workflow
For salons, clinics, and appointment-based services:
```text
Appointment Booking (Customer Portal)
       │
       ▼ (Event: appointment.booked)
Scheduling (Staff Calendar Allocation)
       │
       ▼ (Event: attendance.check_in)
People (Stylist / Professional Assignment)
       │
       ▼ (Event: service.completed)
Billing (Invoice Generation & Payment Checkout)
       │
       ▼ (Event: transaction.completed)
Customer CRM (Spend Profile & Preferences Updated)
       │
       ▼ (Event: crm.updated)
Notifications (SMS / WhatsApp Notification Confirmation)
```

#### 2. Facility / Field Maintenance Workflow
For property management and field service operations:
```text
Helpdesk (Ticket Creation via Customer Portal)
       │
       ▼ (Event: ticket.created)
Work Order (Job Assignment & Tasks Checklist)
       │
       ▼ (Event: work_order.dispatched)
Scheduling (Technician Dispatch Calendar)
       │
       ▼ (Event: attendance.arrival)
Employee (On-Site Mobile Updates & Checklist)
       │
       ▼ (Event: asset.repaired)
Asset (Preventive Logs & Condition Ledger Updated)
       │
       ▼ (Event: stock.depleted)
Inventory (Spare Parts Auto-Decrement)
       │
       ▼ (Event: inventory.updated)
Billing (Contract SLA Validation & Invoicing)
```

---

## 3. Generative Role-Specific UX Layer (The Four Worlds)

The client experience is not a generic layout with toggled menu buttons. The UI is dynamically generated from the active pack composition, presenting unique interfaces to each of the **Four Worlds**:

### World 1: Customer (Mobile-First White-Label)
*   **Purpose:** Discovery, visual menus, slots, and transactions.
*   **Design:** Wholly white-labeled with client-defined colors (`--brand` accent) and asset logos.
*   **Key Views:** `/book` (slot selector), `/menu` (digital visual catalog), and `/my-bookings` (status & reschedule options).

### World 2: Employee (Action-First Deskless)
*   **Purpose:** Frictionless shift execution. Zero business analytics, zero layout choices.
*   **Design:** Large, touch-friendly bump buttons and compact lists formatted for floor tablets or mobile viewports.
*   **Key Views:** `/worker/my-day` (clock-in/out, task sheets) and `/worker/kds` (kitchen/station display queue).

### World 3: Manager / Owner (Operational Command Center)
*   **Purpose:** Resource allocation and exception handling.
*   **Design:** Dense metrics dashboard with symmetric, stretchable grids and scroll-bounded panels. Includes the **Attention Section** for anomalous event notifications.
*   **Key Views:** `/owner/dashboard` and `/owner/settings` (modular controls).

### World 4: Verity HQ Admin (Control Plane System Builder)
*   **Purpose:** Dynamic workspace generation and deployment.
*   **Design:** A visual control room for constructing client operating environments:
    ```text
    [HQ System Builder Console]
    
    CLIENT ORG: AlienKind Cafe
    
    1. Active Modules:  [✓] People  [✓] Menu  [✓] Kitchen  [✓] Tables
    2. Role Matrix:     [✓] Owner   [✓] Server [✓] Cook
    3. Workflow Hook:   Tables -> Menu -> Kitchen -> Serving -> Billing
    4. Brand Identity:  Logo: alien_logo.png | Accent: #00FFCC | Domain: alienkind.verity.ai
    
    [ Deploy Config to Tenant ]
    ```

---

## 4. Design & Glassmorphism Guidelines

All interfaces must respect the unified glassmorphism system:
*   **Surface:** `.verity-glass` cards with `backdrop-filter: blur(20px)` active on both light (`rgba(255,255,255,0.65)`) and dark (`rgba(255,255,255,0.035)`) modes.
*   **Geometry:** High corner rounded profiles (`rounded-[24px]` / `rounded-[32px]`) for structural panels.
*   **Contrast Safety:** Controls must clear the WCAG 3:1 contrast floor, while decorative card borders must remain visible (contrast ratio of 2:1 or higher).
