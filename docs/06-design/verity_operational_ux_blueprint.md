# Verity OS — Operational UX Blueprint & Module Audit

This document establishes the strategic transition of Verity from a **CRUD-centric database administrator** into a **live, role-specific business operating system**. It contains a comprehensive, module-by-module audit of current capabilities against target operational lifecycles, defines the "Four Worlds" UX shell architecture, and establishes event-driven composeability rules.

---

## 1. The Core Philosophy Shift

```
[CRUD Paradigm (Current)]
Database Table  ──>  Filterable Grid  ──>  KPI Cards  ──>  Empty State (If no records)

[Operational Paradigm (Target)]
Real-Time Event  ──>  Task Notification  ──>  Role Dashboard  ──>  Action Button (Clock In/Bump/Approve)
```

### The Rule of Thumb
*   A business does not log in to query CRUD lines; it logs in to ask: **"What needs to happen right now?"**
*   Views must be dense, highly contextual, role-segregated, and action-oriented.
*   The system must surface **bottlenecks and anomalies** that require human decisions (the "Attention" layer).

---

## 2. The Four Worlds UX Shell Architecture

Rather than forcing all personas into a single console shell, Verity divides its front-end interfaces into four distinct, isolated experiences driven by context and role:

```
                         VERITY CORE
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    CUSTOMER SHELL     EMPLOYEE SHELL      OWNER/MGR SHELL     HQ ADMIN SHELL
    (Mobile-First)     (Action-First)      (Command Center)    (Control Plane)
```

### Shell 1: Customer (Mobile-First)
*   **Purpose:** Discovery, scheduling, tables, orders, and payment. Fully white-labeled so the customer feels they are using the client's app (e.g. *AlienKind's App*).
*   **Key Views:**
    *   `/book`: Select service → select provider → select date/time slot → pre-payment check.
    *   `/menu`: Live visual item cards with veg/non-veg tags, description, and "Add to Cart" checkout.
    *   `/my-bookings`: Status, receipts, feedback rating stars, and one-click reschedule/cancel.

### Shell 2: Employee (Action-First)
*   **Purpose:** Simplify shift operations. Zero business metrics, zero configuration, zero administrative taxonomy.
*   **Key Views:**
    *   `/employee/my-day`: Clock in/out button, current shift timer, active task checklist, and next upcoming appointment/order slot.
    *   `/employee/schedule`: Personal shift roster, swap-request button, and availability editor.
    *   `/employee/kds` (Kitchen/Service): KOT queue blocks, bump button, station category filters.

### Shell 3: Owner / Manager (Command Center)
*   **Purpose:** Overall performance monitoring, team governance, resource allocation, and exception resolution.
*   **Key Views:**
    *   `/owner/dashboard`: Revenue trends, table/stylist utilization rates, and the critical **Attention Section** (e.g. *"Kitchen ticket delayed 14m"*, *"2 staff absent"*).
    *   `/owner/settings`: Modular configuration, user permissions matrix, billing subscriptions, and custom pack adoptions.

### Shell 4: HQ / Verity Admin (Control Plane)
*   **Purpose:** Operational governance of Verity itself.
*   **Key Views:**
    *   `/verity/clients`: Directory of all tenant organizations with active users, database size, and billing health.
    *   `/verity/modules`: Version controls, registry dependency graphs, and custom module upload requests.

---

## 3. Module-by-Module Operational Audit & Lifecycles

This audit details the differences between the current database schema/CRUD implementation and the target operational requirements.

### 1. Core (`core`)
*   **Current State:** Handles identity, organization settings, locations, file management, and audit logs.
*   **Operational Gap:** Core behaves as a business module rather than background infrastructure.
*   **Target Lifecycle:** 
    `Create Org → Provision Workspace → Assign Roles → Enable Modules → Record Immutable Audit Trail`
*   **Event Outputs:** `org.created`, `user.authenticated`, `file.uploaded`.

### 2. People (`hr`)
*   **Current State:** Single Employee profile grid with basic contact info.
*   **Operational Gap:** Heavily CRUD-focused. Lacks distinction between directory profiles, shift history, and performance metrics.
*   **Target Lifecycle:** 
    `Hire Employee → Assign Department/Location → Allocate Manager → Schedulable State`
*   **Event Outputs:** `employee.hired`, `employee.terminated`, `employee.assigned_location`.

### 3. Shift Scheduling (`scheduling`)
*   **Current State:** Rosters can be created with simple shift assignment columns.
*   **Operational Gap:** No drag-and-drop rostering UI, no employee-initiated shift swap approvals, and no scheduling conflict check.
*   **Target Lifecycle:** 
    `Publish Roster → Notify Employee → Accept Shift / Request Swap → Shift Active`
*   **Event Outputs:** `shift.published`, `shift.swap_requested`, `shift.swap_approved`.

### 4. Attendance (Tied to `hr`/`scheduling`)
*   **Current State:** Simple logs table tracks punch times.
*   **Operational Gap:** No real-time clock-in/out button for employees, no geofencing, and no automatic exception flagging (e.g. late arrival, missing punch).
*   **Target Lifecycle:** 
    `Employee Clock-In → Active Status Event → Clock-Out → Hours Calculated → Exception Logged`
*   **Event Outputs:** `attendance.clock_in`, `attendance.clock_out`, `attendance.exception_detected`.

### 5. Customers / CRM (`crm`)
*   **Current State:** Prisma models for B2B Leads, Deals, and Pipelines.
*   **Operational Gap:** No UI for pipeline deals. Salons and restaurants have no consumer client record view (visits count, preferences, spending history).
*   **Target Lifecycle (B2C):** 
    `Customer Profile Created → Interaction Event → Transaction Logged → CRM Timeline Updated`
*   **Event Outputs:** `customer.created`, `lead.qualified`, `opportunity.won`.

### 6. Appointment Booking (`booking`)
*   **Current State:** Built client-side calendar, Appointment model with standard status changes.
*   **Operational Gap:** Lacks staff utilization dashboards, clinic/room resource allocation limits, and self-service customer appointment links.
*   **Target Lifecycle:** 
    `Select Service/Stylist → Book Time Slot → Confirm/Complete Service → Billing Trigger`
*   **Event Outputs:** `appointment.booked`, `appointment.cancelled`, `appointment.completed`.

### 7. Menu (`menu`)
*   **Current State:** Model schemas for dishes, categories, and prices.
*   **Operational Gap:** No front-end client-facing menu. Lacks "Draft" vs. "Published" states, and does not support instant "Sold Out" status toggling for kitchen items.
*   **Target Lifecycle:** 
    `Create Menu Item → Set Modifiers/Prices → Publish → Live Menu Selection`
*   **Event Outputs:** `menu_item.created`, `menu_item.availability_changed`.

### 8. Tables & Orders (`tables_orders`)
*   **Current State:** Standard counter checkout and basic table billing hooks.
*   **Operational Gap:** Lacks interactive floor layout editor (drawing tables on a grid), and does not support seat-level ordering.
*   **Target Lifecycle:** 
    `Seated → Order Entry → KOT Dispatched → Table State: Dining → Billing → Cleaning`
*   **Event Outputs:** `table.seated`, `order.created`, `bill.requested`.

### 9. Kitchen (`kitchen`)
*   **Current State:** KDS queue list.
*   **Operational Gap:** Station-specific routing is missing (e.g. Grill orders only show at the Grill station KDS). No delayed ticket indicators or priority order flashing.
*   **Target Lifecycle:** 
    `Order Submitted → Route to Station KDS → Prep Active → Ready to Serve Alert`
*   **Event Outputs:** `kot.received`, `kot.prep_started`, `kot.bumped`.

### 10. Serving (`serving`)
*   **Current State:** Basic list of ready orders.
*   **Operational Gap:** Lacks active server assignment queues and location alerts.
*   **Target Lifecycle:** 
    `Kitchen Bump → Server Notified → Run to Table/Token → Order Delivered`
*   **Event Outputs:** `order.serving_notified`, `order.delivered`.

### 11. Helpdesk (`helpdesk`)
*   **Current State:** Standard CRUD ticketing interface.
*   **Operational Gap:** No workflow pipeline view. Lacks photo attachments on tickets, technicians dispatch schedules, and SLA breach countdowns.
*   **Target Lifecycle:** 
    `Submit Ticket → Assign Technician → Dispatch → On-Site Work → Customer Sign-off`
*   **Event Outputs:** `ticket.created`, `ticket.dispatched`, `ticket.resolved`.

### 12. Assets (`assets` / `maintenance`)
*   **Current State:** Assets metadata registers.
*   **Operational Gap:** Maintenance tasks are separate from asset conditions. Lacks automatic preventive maintenance triggers.
*   **Target Lifecycle:** 
    `Acquire Asset → Assign Location → Trigger Maintenance Schedule → Log Service Record`
*   **Event Outputs:** `asset.registered`, `maintenance.due`, `asset.failed`.

### 13. Inventory (`inventory`)
*   **Current State:** Raw material logs and bin numbers.
*   **Operational Gap:** Reusable only for B2B/Manufacturing. No dynamic POS stock depletion (decrementing inventory automatically based on sales recipes).
*   **Target Lifecycle:** 
    `Purchase Goods → Receive into Bin → Reserve for Order → Consume → Generate Movement Ledger`
*   **Event Outputs:** `stock.received`, `stock.reserved`, `stock.depleted`.

### 14. Procurement (`procurement`)
*   **Current State:** Supplier lists and simple purchase bills.
*   **Operational Gap:** Lacks Request for Quote (RFQ) automation, goods receipt inspections, and dynamic item catalog mappings.
*   **Target Lifecycle:** 
    `Identify Shortage → Create PO → Receive Goods → Quality Inspection → GRN → Invoice Match`
*   **Event Outputs:** `po.created`, `goods.received`, `grn.approved`.

---

## 4. Vertical Navigation Refinement

To avoid engineering taxonomy inside the sidebar, navigation groups must be dynamically resolved based on the vertical business pack, prioritizing operational flows:

| Vertical Pack | Primary Group | Secondary Group | Config Group |
| :--- | :--- | :--- | :--- |
| **`modern_qsr`** | **TODAY:** Counter POS, Kitchen KDS, Serving Queue | **BUSINESS:** Digital Menus, CRM Profiles | **MANAGE:** Billing, Settings |
| **`lifestyle_services`** | **TODAY:** Booking Calendar, Check-In, Shift Schedules | **BUSINESS:** Services Catalogue, Client Profiles | **MANAGE:** Billing, Settings |
| **`facility_management`** | **TODAY:** Tickets, Dispatch Schedule, Work Orders | **BUSINESS:** Asset Catalog, Site Map | **MANAGE:** Roster, Settings |

---

## 5. Architectural Transformation Plan

We will transform Verity from its current CRUD layout into an operational platform across 6 phases:

```
┌────────────────────────┐
│ Phase 1: Design System │ ──> Typography, thin steel border cards, dense layouts
└────────────────────────┘
            │
┌────────────────────────┐
│ Phase 2: Role Shells   │ ──> Separate pages into Customer, Employee, and Owner shells
└────────────────────────┘
            │
┌────────────────────────┐
│ Phase 3: Event Engine  │ ──> Wire prisma events (e.g. booking.completed -> billing.trigger)
└────────────────────────┘
            │
┌────────────────────────┐
│ Phase 4: Restaurant OS │ ──> Interactive floor maps, Station-filtered KDS views
└────────────────────────┘
            │
┌────────────────────────┐
│ Phase 5: Lifestyle OS  │ ──> Appointment check-in queues, staff utilization grids
└────────────────────────┘
            │
┌────────────────────────┐
│ Phase 6: HQ Control    │ ──> Portfolio MRR overview and deployment status checkers
└────────────────────────┘
```
