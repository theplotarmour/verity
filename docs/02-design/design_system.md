# Design System Guide

Verity uses a premium, highly responsive design system centered around **clean, minimal glassmorphism**. The interface is optimized to feel like a custom operating console built specifically for the client's industry and brand.

---

## 1. Glassmorphism Tokens & Contrast Rules

Every card panel, drawer, and modal utilizes the `.verity-glass` utility class for background treatment.

### Glass Styling (`.verity-glass`)
*   **Backdrop Filter:** `backdrop-filter: blur(20px) saturate(140%)` is applied globally in both light and dark themes.
*   **Theme Adaptations:**
    *   **Light Mode:** Translucent white backgrounds (`rgba(255, 255, 255, 0.65)`) with a thin silver border (`#AEAEB8` or `rgba(0, 0, 0, 0.06)`).
    *   **Dark Mode:** Translucent charcoal backgrounds (`rgba(255, 255, 255, 0.035)`) with a thin steel border (`rgba(255, 255, 255, 0.26)`).
*   **Contrast Safety (WCAG 1.4.11):** Interface controls and interactive components must achieve at least 3:1 relative contrast against their backdrops. Card borders must maintain at least a 2:1 contrast ratio to ensure clean readability.

---

## 2. Layout Geometry

*   **High Corners:** Outer cards, drawer sheets, and main shell workspace panels utilize `rounded-[24px]` or `rounded-[32px]`. Small interactive controls and buttons use `rounded-[16px]` or `rounded-full`.
*   **Symmetric Heights:** Twin panels and dashboard items must stretch to equal height using `items-stretch` grid layouts instead of aligning to the top (`items-start`).
*   **Bounded Viewports:** Avoid forcing vertical scrollbars on the outer page body. The main app canvas should fit statically in the viewport. Inner lists and config lists scroll independently (`overflow-y-auto`) within bounded cards (e.g. `h-[520px]`).

---

## 3. The Four Worlds UX Shells

Verity segments client interfaces into four distinct operational worlds:

### 1. Customer Portal (Mobile-First White-Label)
*   **Target:** B2C Customers booking appointments or ordering from menus.
*   **Style:** Fully white-labeled. The background gradients, logo assets, and primary accent colors (`--brand`) are dynamically read from the tenant configuration database.
*   **Routes:** `/book` and `/my-bookings`.

### 2. Employee Shell (Action-First Deskless)
*   **Target:** Floor workers executing shifts, checklists, and queues.
*   **Style:** Large buttons, high-contrast actions, and touch-screen targets. Zero business analytics and zero configuration menus.
*   **Routes:** `/worker/my-day`, `/worker/schedule`, and `/worker/kds`.

### 3. Owner/Manager Shell (Command Center)
*   **Target:** Managers monitoring outlet metrics and operations.
*   **Style:** Dense data widgets, sparklines, staff calendars, and the **Attention Section** for anomalous event alerts.
*   **Routes:** `/owner/dashboard` and `/owner/settings`.

### 4. Verity HQ Admin Portal (Control Plane)
*   **Target:** Platform operators provisioning tenant configs.
*   **Style:** Clean lists of tenants, billing history trackers, and the **Visual System Builder** allowing operators to check/uncheck client modules and instantly preview which workflows are illuminated.
*   **Routes:** `/verity/clients/[id]`.
