# Verity — The Composable Business Operating Platform

This manifesto defines the absolute architectural vision and technical boundaries of Verity. Verity is **not** a vertical SaaS product (such as a restaurant ERP, clinic manager, or salon booking system). Rather, those configurations are emergent systems assembled dynamically on top of Verity's unified operating engine.

---

## 1. The Core Flywheel: Capabilities to Client Systems

```
[Module Library]  ──>  [Capabilities]  ──>  [Packs]  ──>  [Workflows]  ──>  [Client OS]
  (Code Registry)       (Data Schemas)     (Bundled templates)   (Event hooks)     (Dynamic App)
```

1.  **Modules:** Codified units of software capability. Each has defined dependencies, permissions, and database models.
2.  **Capabilities:** The individual operational blocks exposed by a module (e.g. *Appointment Scheduling Engine*, *Workforce Scheduling Engine*).
3.  **Packs:** Preconfigured vertical templates (e.g. `lifestyle_services`, `modern_qsr`) that make onboarding as simple as selecting a business type.
4.  **Workflows:** Composed interactions where modules react to other modules via standard platform events (e.g. `booking.completed` automatically triggers `billing.create_order`).
5.  **Client System:** The customized runtime operating system instantiated for a specific tenant organization.

---

## 2. Core Taxonomy: Universal vs. Vertical Modules

The module library is strictly categorized into platform layers to ensure vertical logic never leaks into core capabilities:

### A. Universal Modules (The Base)
Universal modules are vertical-agnostic and reusable across any business configuration:
*   **Core:** Identity, workspace, notification dispatchers, file attachments, and activity timelines.
*   **People:** Employee directory, shift registries, timecards, and attendance/leave tracking.
*   **CRM & Customers:** Centralized contact identity layer, client value scores, and transaction history cards.
*   **Operations:** Sites hierarchy, helpdesk ticket pipelines, asset registries, and preventive maintenance triggers.
*   **Finance & Billing:** Accounts ledger integration, invoices, payroll summary registers, and POS checkout systems.

### B. Vertical & Specialized Modules (The Extensions)
Vertical modules add specialized data schemas and views that can be optionally layered onto any base:
*   **Menu:** Dish categories, item modifiers, tax rates, and active stock toggles.
*   **Tables & Orders:** Seat layouts, dining order registers, and live table status indicators.
*   **Kitchen:** Station-specific KOT queues, priority timers, and bump buttons.
*   **Appointment Booking:** Time-slot selectors, professional assignment slots, and booking status controls.
*   **Automotive:** Vehicle catalogue indices, generation/year fitment, and product compatibility mapping.

---

## 3. The Experience Engine: Composed UI Generation

The client front-end is generated dynamically at runtime based on the organization's configuration. It is never hardcoded:

```
                  VERITY ENGINE (Runtime)
                            │
               ┌────────────┴────────────┐
               │                         │
     DYNAMIC NAVIGATION        DYNAMIC DASHBOARDS
       (resolveNavGroups)     (resolveDashboardWidgets)
```

1.  **Navigation Groups:** Resolved dynamically based on enabled modules and mapped to semantic operational terms (`TODAY`, `BUSINESS`, `MONEY`, `MANAGE`) rather than technical database titles.
2.  **Dashboard Widgets:** Composed from the list of enabled capabilities, rendering only relevant dashboards (e.g. stylist utilization panels for Salons, delayed preps alerts for QSRs).

---

## 4. Module Event Contracts (Decoupled Composition)

To prevent tight database coupling, modules communicate through standard event contracts. Every module declares its inputs, outputs, and event hooks:

```typescript
// Conceptual contract for the Appointment Booking module
export const bookingModule = createModule({
  key: "booking",
  version: "1.0.0",
  requires: ["core", "hr", "sales"],
  
  // Emitted operational milestones
  events: [
    "appointment.created",
    "appointment.confirmed",
    "appointment.completed",
    "appointment.no_show"
  ],
  
  // Reactive hooks
  reactions: {
    "appointment.completed": {
      trigger: "billing.create_order_draft"
    },
    "appointment.no_show": {
      trigger: "crm.increment_no_show_score"
    }
  }
});
```
