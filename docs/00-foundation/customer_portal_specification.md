# Customer Portal Specification (B2C World 1)

This specification defines the product features, user flows, database relations, and styling guidelines for Verity's customer-facing portals: the **Booking Portal** (`/book`) and the **Digital Menu** (`/menu`).

---

## 1. White-Label Brand Engine

The customer-facing portal is whitelabel-ready. The system generates the user interface dynamically based on the tenant's brand settings configured in Verity HQ.

### Styling Alphas & Variables
Every customer interface reads brand parameters at the root layout:
```html
<html style="--brand: ${tenant.brandColor}; --brand-contrast: ${tenant.brandContrastColor};">
```
*   **Brand Color (`--brand`):** Used for primary buttons, selected calendar dates, active slots, and category tabs.
*   **Logo Rendering:** Injected into the top navigation header bar, falling back to the text name of the Organization if no asset URL is present.
*   **Glassmorphic Console:** The customer portals inherit the same `.verity-glass` cards as the core system, but styled in light mode by default (translucent white `rgba(255, 255, 255, 0.75)` backdrop blur) to ensure maximum accessibility and consumer trust.

---

## 2. Service Booking Flow (`/book`)

A mobile-first scheduler where consumer bookings generate calendar events and trigger downstream actions.

```text
[ Service Selection ] ──> [ Staff Selection ] ──> [ Slot Picker ] ──> [ Confirmation ]
```

### Flow Steps:
1.  **Step 1: Service Selection**
    *   Renders a clean list of active services (e.g., "Haircut & Style", "Surgical Consult") grouped by category.
    *   Displays duration (minutes) and price dynamically formatted using the currency helper.
2.  **Step 2: Staff / Professional Selection**
    *   Displays list of employees entitled to perform the service, complete with avatars.
    *   Includes a default **"Any Available Staff"** option (prioritizing high-utilization sorting).
3.  **Step 3: Dynamic Slot Picker**
    *   A calendar widget showing available dates.
    *   *Calculation logic:* Queries the employee `Shift` roster for the selected day, subtracts current `Appointment` durations, and generates valid 15/30-minute time intervals.
4.  **Step 4: Contact Details & Confirmation**
    *   Accepts customer Name, Phone, and Email.
    *   Submitting the form creates the `Appointment` record and emits the `appointment.confirmed` event to the bus.

---

## 3. Digital Menu / Catalog Flow (`/menu`)

A digital menu card for restaurant dining tables (using QR codes) or retail store browsing.

```text
[ Table Scan / Landing ] ──> [ Categorized Menu ] ──> [ Product Detail ] ──> [ Simple Cart ]
```

### Flow Steps:
1.  **Step 1: Category Browser**
    *   Renders a horizontal scrolling pill selector of product categories (e.g., "Burgers", "Drinks", "Desserts").
    *   Displays products in a dense, symmetric 2-column card grid.
2.  **Step 2: Product Detail Modal**
    *   Clicking a card slides up a glassmorphic sheet showing the description, allergen tags, and price.
3.  **Step 3: Simple Cart & Checkout**
    *   Allows adding items to a local cart.
    *   For dining tables (e.g., Table 4): Checkout submits the items directly to the table's active order, creating a `DiningOrderItem` and notifying the Employee KDS station.

---

## 4. Database Schema Scoping

Both portals read directly from the tenant-scoped database relations:
*   **Tenancy Scoping:** All queries are filtered by `factoryId` derived from the subdomain request (e.g., `client-subdomain.verity.ai`).
*   **Required Relations:**
    *   `Service`: `{ id, name, description, duration, price, categoryId }`
    *   `Appointment`: `{ id, customerName, customerPhone, customerEmail, startTime, endTime, employeeId }`
    *   `Product` (replaces ItemMaster): `{ id, name, description, price, sku, categoryId }`
    *   `Shift`: `{ id, employeeId, date, startTime, endTime }`
