# Verity UI Component Architecture & Design System Specification

*   **Date**: 2026-08-28
*   **Target File**: `Verity_Component_Specification.md`
*   **Design Paradigm**: Linear × Raycast × Vercel Premium Restraint
*   **Accent Color**: `#00D1B2` (`var(--brand)` / `var(--accent)`)

---

## 1. Verity Design Language Rules

Verity is a premium operating system for production and service enterprise workspaces. It rejects generic "SaaS card grids" in favor of strict, high-end visual utility.

### A. Color & Typography
*   **Typography**: Satoshi / Geist Sans / Instrument Sans (heavy preference toward Geist for developer/software credibility). Type scale is compact and tightly letter-spaced.
*   **Monochromatic Base**: The UI is primarily monochrome (deep rich grays `#09090B` / `#18181B` in dark mode, clean off-whites in light mode).
*   **Accent Controls**: The brand accent `#00D1B2` is reserved strictly for active navigation markers, selection cues, and primary interactive states (never use it as a decorative highlight).
*   **Semantic Color Guard**: Green (success), Amber (warning), Red (danger), and Blue (info) are semantic indicators only, styled with low-saturation borders to prevent visual noise.

### B. Geometry & Shadows
*   **Borders**: 1px low-contrast dividers (`border-line` or `border-neutral-800` in dark mode).
*   **Radii**: Low, structured rounded edges:
    *   Buttons & Inputs: `8px` (`rounded-lg`)
    *   Cards & Small Panels: `12px` (`rounded-xl`)
    *   Modals & Popups: `16px` (`rounded-2xl`)
    *   Large Workspace Blocks: `20px` (`rounded-3xl`)
*   **Shadows**: Soft, near-invisible ambient diffusion. No heavy offset shadows.

---

## 2. Curated 21st.dev Ecosystem Layer

Instead of choosing one monolithic component library, Verity integrates verified open-source primitives curated from the design-engineer ecosystem:

```
                            ┌─────────────────────────┐
                            │    VERITY HIGH-END UI   │
                            └────────────┬────────────┘
                                         │
       ┌───────────────────┬─────────────┴─────┬───────────────────┐
       ▼                   ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  FOUNDATION  │    │  DISCIPLINE  │    │    MOTION    │    │  VISUAL WOW  │
│ • Base UI    │    │ • Origin UI  │    │ • Magic UI   │    │ • Kokonut UI │
│ • Radix UI   │    │ • Geist      │    │ • React Bits │    │ • Aceternity │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Component Registry & Source Mapping

| System Role | Primary Library Sources | Implementation Rule |
| :--- | :--- | :--- |
| **Foundation & Behavior** | Base UI / Radix | Headless, accessible primitives (WCAG 2.2 compliant). |
| **Forms, Inputs, & Filters** | Origin UI / shadcn | Zero-bloat, strict business fields (dropdowns, checkmarks). |
| **Visual Geometry & Cards** | Kokonut UI | Clean, structured card grids and panels. |
| **Restrained Motion UI** | Magic UI / React Bits | Number tickers, progress shimmers, loading animations. |
| **Interactive Transitions** | Motion Primitives | Physics-coherent page and drawer transitions (150-250ms). |
| **Aesthetic Spotlights** | Aceternity / Cult UI | Selective Bento grids, timeline tracks, and glare cards. |

---

## 3. Custom Verity Signature Components

To establish a distinctive software brand identity, we construct proprietary business components on top of our curated foundation:

### A. The Smart Table (TanStack Table + Context Panel)
Verity’s primary data grid goes beyond basic HTML columns:
*   **TanStack Headless Core**: Manages sorting, pagination, and multi-column filters.
*   **Context Panel Insertion**: Hovering over a row displays a subtle contextual action trigger (`⋮`). Clicking a row does not load a new page; instead, a context panel glides in from the right edge, keeping the user’s primary workspace visible.

```
┌───────────────────────────────────────┬──────────────┐
│  TanStack Smart Table                 │ Detail Panel │
│  [x] Sharma Industries  28  ₹8.42L    │ ──────────── │
│  [ ] ABC Manufacturing  19  ₹5.12L    │ Overview     │
│  [ ] Kapoor Traders      7  ₹82K      │ Active Orders│
└───────────────────────────────────────┴──────────────┘
```

### B. The Universal Verity Object Card
Every core entity (Customer, Order, Invoice, Product, Employee) conforms to a single, layout-consistent interface:
*   **Object Header**: Top bar featuring context actions, a clear status badge, and key lifetime metrics.
*   **Tabbed Deck**: Switches local sub-panels (Overview, Orders, Invoices, Timeline) without page reloads.

### C. The CommandSurface (`⌘K`)
An advanced Command Palette that acts as the operating system's launcher:
*   **Fuzzy Search**: Instantly parses across client directories, active orders, settings, and workflows.
*   **Natural Action Parsing**: Inputting commands (e.g. `Create order for Sharma`) opens pre-populated form sheets.

### D. The Dynamic Command Bar
In place of clustered desktop buttons, Verity utilizes floating, context-aware command bars docked at the bottom of data grids:
```
┌────────────────────────────────────────────────────────┐
│ [✓ Create]   [⌕ Filter]   [⇄ Export]   [🔒 Suspend]     │
└────────────────────────────────────────────────────────┘
```

### E. Typographic Analytics
Dashboards move away from generic charts, using minimal, text-heavy telemetry elements with embedded sparklines:
```
REVENUE
₹12.84L  ↑ 18.2% vs prev month
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]
```

---

## 4. Platform Component Structure

The `/packages/ui` repository directory structure is organized logically to separate behavioral primitives from custom business components:

```
/packages/ui/
├── components/
│   ├── primitives/        # Button, Input, Select, Checkbox (Base UI/Origin)
│   ├── navigation/        # Sidebar, Topbar, Breadcrumb, Tabs
│   ├── data/              # SmartTable, Charts (Recharts), Timeline
│   ├── business/          # CustomerCard, OrderCard, InvoiceCard
│   ├── workflow/          # Kanban, Workflow (React Flow), Stepper
│   ├── documents/         # FileUploader, DocumentViewer, PDFPreview
│   ├── communication/     # Comments, ActivityFeed, Notifications
│   └── ai/                # AICommand, AIInsight, AIAction
```
