# PRD 07 — Usability & Vertical Completeness

**Phase A · Default Seeds · Menu UI · Tables & Orders UI**

---

## 1. Problem

Verity OS is designed to be a modular platform, but it is currently **hollow** for non-manufacturing verticals:
1. **No Front-End Views**: The core restaurant modules (`menu` and `tables_orders`) have backend database logic and actions, but no front-end pages exist.
2. **Missing Navigation**: Neither `menu` nor `tables_orders` contributes `navItems` to the registry, so they are completely hidden in the sidebar navigation.
3. **Hardcoded Demo Seeds**: Every new tenant starts with blank data or falls back to Carxen's automotive departments (Cutting, Stitching, QC) and material specs, with no vertical-specific setup.

---

## 2. Requirements

### R1 — Dynamic Vertical Seeding
When a tenant is provisioned via the HQ console or CLI:
* **Restaurant OS:** Auto-seed standard restaurant departments:
  * `Kitchen` (QC-enabled)
  * `Serving`
  * `Billing`
  * `Bar` (if needed)
* **Retail OS:** Auto-seed retail departments:
  * `Stockroom`
  * `Sales Floor`
  * `Billing / POS`
* **Auto Components:** Default to the current Carxen blueprint/departments model.

---

### R2 — Menu Management Screen (`/owner/menu`)
Provide a page for restaurant managers to configure their menu offerings.
* **Layout:** Grid of Categories (e.g. Starters, Beverages) showing cards of menu items.
* **Features:**
  * **Add Category:** Simple modal to create a category (unique name).
  * **Add/Edit Item:** Form specifying name, description, price (entered as decimal, stored as integer paise), and a Veg/Non-Veg toggle.
  * **Availability Toggle:** A simple switch on the item card to toggle `available` status in real-time (calls the `toggleAvailability` server action).
  * **Photo Upload:** Simple file upload to attach a thumbnail image.

---

### R3 — Tables & Floor Management (`/owner/tables`)
Provide an interactive floor plan grid to manage seating and place orders.
* **Layout:** A grid showing table numbers, capacities, and color-coded status badges:
  * `AVAILABLE` (Green)
  * `OCCUPIED` (Amber - showing running order total)
  * `BILLED` (Red - showing unsettled bill amount)
* **Features:**
  * **Layout Editor:** Option to add a table (select number and seat capacity).
  * **Place Order (KOT Modal):** Clicking an available or occupied table opens a dialog to add menu items (increments quantity, showing current KOT list) and sends them to the kitchen (creates a `DiningOrder` in `DRAFT`/`ACCEPTED` state).
  * **Bake Bill (Checkout Modal):** Clicking a table in `OCCUPIED` status opens a checkout panel showing itemized tallies, applies a discount code if required, computes tax/total, and transitions state to `BILLED`. Settling payment (Cash, Card, UPI) clears the table back to `AVAILABLE`.

---

### R4 — Register Navigation Items
Modify [`src/platform/modules/registry.ts`](file:///d:/Code/verity/src/platform/modules/registry.ts) to register navigation items for the missing modules:
* **`menu`**:
  ```typescript
  navItems: [
    {
      href: "/owner/menu",
      label: "Menu Editor",
      iconKey: "menu",
      group: "Production",
      permission: "CREATE_ORDER",
      sortOrder: 0,
    }
  ]
  ```
* **`tables_orders`**:
  ```typescript
  navItems: [
    {
      href: "/owner/tables",
      label: "Tables & Seating",
      iconKey: "table",
      group: "Production",
      permission: "CREATE_ORDER",
      sortOrder: 1,
    }
  ]
  ```

---

## 3. Success Criteria

* **Kent Jones** logs in, clicks **"Tables & Seating"** from his sidebar, places a mock order for a "Margherita Pizza" on Table 4, and sees it immediately appear in Chef Dan's **"Kitchen Queue"** view.
* Provisioning a new "Retail OS" tenant from HQ creates standard retail departments instead of "Cutting" and "Stitching".
