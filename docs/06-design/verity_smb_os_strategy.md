# Verity — SMB & Lifestyle Services OS Strategy

This document outlines the strategic pivot from Enterprise Franchise Modules to lightweight, high-utility modules tailored for **Modern QSRs, independent restaurants, salons, boutiques, and lifestyle businesses**.

---

## 1. Vertical Strategy Shift

```
[Old Roadmap]  ==>  Franchise Ops (O1-O5)  &  Field Compliance (F1-F5)  [DEFERRED]
[New Roadmap]  ==>  Appointment Booking  &  QSR Checkout / Self-Service  [ACTIVE]
```

### Target Audience
*   **Modern QSRs & Cafes:** Independent, tech-forward dining spots looking for digital order counters, UPI integration, and immediate checkout without traditional sit-down floor maps.
*   **Lifestyle Businesses (Salons, Spas, Boutiques):** Service providers requiring staff-availability calendars, appointment bookings, customer histories, and digital billing.
*   **Young Entrepreneurs & SMBs:** Clean, light dashboards that feel cohesive out-of-the-box and run their daily operations in one tab.

---

## 2. New Module Specification: Appointment Booking (`booking`)

### Schema Design (Draft)
```prisma
model Appointment {
  id              String      @id @default(cuid())
  factoryId       String
  factory         Factory     @relation(fields: [factoryId], references: [id])
  customerName    String
  customerPhone   String
  customerEmail   String?
  serviceName     String      // e.g. "Hair Styling", "Custom Tailoring"
  price           Float
  employeeId      String      // Stylist, Tailor, or Agent assigned
  employee        User        @relation(fields: [employeeId], references: [id])
  startTime       DateTime
  endTime         DateTime
  status          String      // PENDING, CONFIRMED, COMPLETED, CANCELLED
  notes           String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}
```

### Module Registry Definition (`src/platform/modules/definitions/booking.ts`)
```typescript
import { createModule } from "../sdk";

export const bookingModule = createModule({
  key: "booking",
  version: "1.0.0",
  name: "Appointment Booking",
  description: "Schedule service appointments, assign staff slots, and manage client bookings.",
  requires: ["core", "hr", "sales"],
  permissions: [
    { key: "booking.view", label: "View bookings and schedules", group: "Booking" },
    { key: "booking.manage", label: "Create and edit appointments", group: "Booking" },
    { key: "booking.staff", label: "Manage staff availability slots", group: "Booking" },
  ],
  navItems: [
    {
      href: "/owner/booking",
      label: "Bookings",
      iconKey: "calendar",
      group: "Service Operations",
      requires: "booking.view",
      sortOrder: 4,
    },
  ],
});
```

---

## 3. Packs Alignment (`src/platform/tenancy/packs.ts`)

We introduce/update three packs to target this market:

1.  **`lifestyle_services` (Salon & Boutique OS):**
    *   **Modules:** `core`, `hr`, `billing`, `sales`, `crm`, `booking`
    *   **Value:** Complete pipeline from appointment scheduling to retail sales checkout and client records.
2.  **`modern_qsr` (Table-less Quick Service POS):**
    *   **Modules:** `core`, `hr`, `menu`, `tables_orders` (modified for token/name queues), `kitchen`, `billing`
    *   **Value:** Quick ticket entry, immediate UPI checkout, and KDS preparation screen.
3.  **`retail_os` (Boutique & Retail OS):**
    *   **Modules:** `core`, `hr`, `inventory`, `billing`, `sales`, `crm`, `procurement`
    *   **Value:** Stock replenishment, barcode receipting, and walk-in sales.

---

## 4. UI/UX Refinements

To capture this market, the UI/UX must adopt the premium aesthetic detailed in our design specifications:
*   **Calendars:** Smooth, rounded calendar blocks (`rounded-[24px]`) to schedule appointments easily.
*   **POS interface:** High-contrast checkout screen optimized for tablets and mobile devices.
