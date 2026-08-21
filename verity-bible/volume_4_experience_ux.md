# VERITY MASTER BIBLE — VOLUME IV
## Experience Shells, Workspaces & UX Law

This volume establishes the visual and user-experience laws of Verity: from information density rules to the role-based workspaces, mobile field patterns, and the absolute ban on ornamental visual styles.

---

## 1. The UX Constitution
Verity is serious operational software. Its interfaces must feel **premium, precise, calm, and highly intentional**. We reject the gamified, over-colored SaaS designs common in consumer software.

### A. Information Density [INFERRED]
*   **Context-Sensitive Density:** 
    *   *High Density:* Console views, dispatch boards, and scheduling calendars must maximize information visibility on desktop monitors to prevent excessive scrolling.
    *   *Low Density:* Mobile worker screens, check-in prompts, and customer booking wizards must focus on one single primary action per screen.
*   **Whitespace as Structure:** We use alignment and negative space rather than borders, boxes, and grids to separate information hierarchies.

### B. Visual Restraint & The Glassmorphism Rule [FACT]
*   **The Glassmorphism Restriction:** Verity must NOT use glassmorphic blur (`.verity-glass`, translucent backdrops) as its default visual identity. Ornamental transparency reduces legibility and degrades performance.
*   **Allowed Exceptions:** Translucent overlays are permitted ONLY when showing temporary contextual layers, such as:
    1.  A slide-up mobile sheet overlaying the active schedule.
    2.  A floating cart panel over a digital menu.
    3.  A quick-action drop-down on a calendar.
*   **The Default Surface:** The default layout uses solid, high-contrast, structured surfaces (`bg-surface` resolving to `#FFFFFF` in light mode, `#1C1C1E` in dark mode) to maintain crisp, legible text hierarchies.

---

## 2. Role-Centric Workspaces
Verity is one core system, but it is not one single interface. We partition user experience into four distinct "Worlds" (Experience Shells):

```text
    ┌───────────────────────────────────────────────────────────────┐
    │                        VERITY CORE DATA                       │
    └──────┬────────────────┬────────────────┬────────────────┬─────┘
           │                │                │                │
  ┌────────▼──────┐  ┌──────▼───────┐  ┌─────▼────────┐  ┌────▼─────────┐
  │  HQ CONSOLE   │  │ OWNER SHELL  │  │ WORKER SHELL │  │ B2C PORTAL   │
  │ (Superadmins) │  │  (Managers)  │  │ (Deskless)   │  │ (Customers)  │
  └───────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### 1. HQ Console (Platform Operators) [FACT]
*   **User:** Superadmins, billing team.
*   **Goal:** Manage client directories, agreements, module entitlements, and tenant limits.
*   **UX:** Extreme data density, tabular grids, diagnostic log views.

### 2. Owner Shell (Business Managers & Executives) [FACT]
*   **User:** Business owners, dispatchers, HR managers, schedulers.
*   **Goal:** Track operational health, schedule shifts, approve payments, and view performance dashboards.
*   **UX:** Multi-pane layouts, interactive calendars, drag-and-drop dispatch boards, and KPI metric cards showing bottlenecks.

### 3. Worker Shell (Deskless Frontline) [FACT]
*   **User:** Security guards, cleaners, technical workers, field staff.
*   **Goal:** Clock in/out, view daily visits, complete checklists, and report incidents.
*   **UX:** Mobile-first, single-column lists, high-contrast text, and massive tap targets (minimum 48px). Optimized for one-handed operation on low-tier smartphones.

### 4. B2C Portal (End Customers) [FACT]
*   **User:** Clients booking services, ordering from digital catalogs, or tracking service progress.
*   **UX:** Clean, elegant, whitelabeled (respecting the tenant's brand colors), and showing zero internal business metrics or technical jargon.

---

## 3. Workspaces vs. Dashboards [INFERRED]
*   **Dashboards are for reading:** They display analytics and historical trends.
*   **Workspaces are for executing:** A workspace is an interactive queue that shows a user:
    1.  What is urgent right now (Alerts, SLA warnings).
    2.  What tasks are assigned to them today.
    3.  What approvals are pending their sign-off.
    4.  A list of active exceptions requiring resolution.

---

## 4. Mobile Field & Offline UX Law [PROPOSED]
Operating in the field requires specialized UI design that handles bad network states:
*   **Task-First Navigation:** When a worker opens the mobile app, they land directly on their "My Day" view. There is no sidebar navigation, no complex settings, and no charts.
*   **Offline State Clarity:**
    *   When the network drops, a clear, persistent "Working Offline" banner slides up at the bottom center.
    *   Mutations (e.g., ticking off a task) are written instantly to the local queue, and the UI transitions optimistically.
    *   The sync queue count is shown in the footer (e.g., "3 changes pending sync").
    *   Once connection is restored, the banner changes to a green "Reconnected" state, fades out after 3 seconds, and the queue syncs in the background.

---

## 5. UI Semantics & Time Layouts

### A. Status Semantics [INFERRED]
We use absolute, non-overlapping visual tokens for state representation:
*   🟢 **Green (Success / Completed):** Work is finished and verified; attendance is verified.
*   🟡 **Yellow (Warning / Pending / Draft):** A transaction is in draft state; a shift has not yet started.
*   🔴 **Red (Danger / Failed / Overdue):** An SLA is breached; check-in is late; payment failed.
*   🔵 **Blue (Active / In-Progress):** Worker is currently clocked in; repair work is in progress.

### B. Time & Urgency Semantics [INFERRED]
*   **Operational Time:** Schedulers see time zones in local project contexts (e.g., IST).
*   **Urgency Levels:** We separate Priority (business importance, set by contract) from SLA Urgency (time remaining, computed by system). An item with `Medium Priority` can have `Critical Urgency` if the SLA deadline is 5 minutes away.
