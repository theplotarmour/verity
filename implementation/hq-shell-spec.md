# Verity HQ — Shell Specification

**Date:** 2026-08-26
**Status:** **DESIGN ONLY — NOT IMPLEMENTED.** Recorded at product-owner instruction so the
specification survives; no code, component, route or style has been written against it.
**Implements when:** Phase 1 (visual system, shell mechanics) and Phase 2 (functional surfaces).
**Blocked by:** Phase 0.9 is currently FAIL. Nothing here may be built until Phase 0 closes.

---

## 1. Principle

> The shell is **production-quality infrastructure**. It is **not** the same thing as implementing
> the modules it navigates to.

Build the shell to a finished standard; keep the functional surface area behind it disciplined.
Navigation entries exist only for things that exist. No feature is implied by a menu item.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ VERITY HQ                                      Search   ⌘K   ◐  User │
├───────────────┬──────────────────────────────────────────────────────┤
│               │                                                      │
│  VERITY       │  Page header                                         │
│  HQ           │  ──────────────────────────────────────────────────  │
│               │                                                      │
│  Overview     │                                                      │
│  Clients      │              PAGE CONTENT                            │
│  People       │                                                      │
│  Organizations│                                                      │
│  Roles        │                                                      │
│  Modules      │                                                      │
│  Operations   │                                                      │
│  Audit        │                                                      │
│               │                                                      │
│ ───────────── │                                                      │
│ Settings      │                                                      │
│               │                                                      │
│ ┌───────────┐ │                                                      │
│ │ User      │ │                                                      │
│ │ Admin     │ │                                                      │
│ └───────────┘ │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

---

## 3. Sidebar

### Primary navigation — exactly these, in this order

1. Overview
2. Clients
3. People
4. Organizations
5. Roles & Permissions
6. Modules
7. Operations
8. Audit

— divider —

9. Settings

**Do not add navigation for things that do not exist.** Twenty entries because we might one day
need them is the failure mode.

Navigation must remain **contribution- and permission-driven**, as the current shell already is:
`navigationFor()` filters by resolved permissions and the shell holds no route map. Future modules
add their own entries through that contract, never by editing the shell.

### Sidebar behaviour — hard requirements

- Fixed shell infrastructure.
- Navigation region independently scrollable.
- **No scrollbar when everything fits.**
- Scrollbar appears **only** when required.
- Logo / header never scrolls.
- Account card never gets pushed away.
- Long navigation does not increase page height.
- Permission-filtered navigation behaves correctly at every length.

**Mechanics.** The current `min-h-dvh` grid makes the whole application one scrolling document and
the `<aside>` has no scroll container — this is the structural defect recorded in
`phase-1-design-audit.md` §5. The target:

```
h-dvh, overflow-hidden                       ← shell owns the viewport
├── aside  h-full, flex column
│     ├── identity          shrink-0         ← never scrolls
│     ├── nav               min-h-0, overflow-y-auto   ← scrolls only when needed
│     ├── divider + Settings shrink-0
│     └── operator card     shrink-0         ← pinned
└── main column  min-w-0, flex column
      ├── top bar           shrink-0         ← persistent chrome
      └── page region       min-h-0, overflow-y-auto
```

`min-h-0` is load-bearing: a flex child defaults to `min-height: auto` and refuses to shrink below
its content, which is why an `overflow-y-auto` region silently pushes the page instead of scrolling.
**Do not add `overflow-y-auto` without establishing height ownership.**

---

## 4. HQ identity

Top-left establishes platform level immediately:

```
VERITY
HQ
```

Not "Dashboard". This differentiates **platform HQ** from a future client's application. Whenever
Global HQ exists, the operator must always know: *I am operating at the Verity platform level.*

---

## 5. Top bar — restrained

**Left:** page title or breadcrumb — `Clients`, or `Clients / Acme Manufacturing`.

**Right:** global search / command entry · theme toggle · notifications or activity *if already
supported* · operator profile menu.

Do not overload it.

---

## 6. Search / command surface

The entry point may exist before the command system does:

```
Search…            ⌘K
```

But **do not ship a decorative search box that pretends to search everything.** If it is not
functional it must either be clearly marked as planned, or not exposed.

The current implementation is already honest about this — it says "Search this page" and is scoped
to loaded records, with platform search recorded as deferred. Preserve that honesty.

Eventually: search clients · people · organizations · audit · jump to page. Later, not now.

---

## 7. Theme control

Light and Dark both work. The toggle stays in the shell. **The shell is the first place both themes
must be properly polished** — it is the surface every other page inherits from.

---

## 8. Operator profile

Foot of the sidebar:

```
┌─────────────────────────────┐
│ DS                          │
│ <display name>              │
│ <role label>                │
└─────────────────────────────┘
```

**Nothing is hardcoded.** The identity comes from the authenticated session; the role label comes
from authorization/membership data. In the current local environment that resolves to the
configured HQ administrator — resolved, never written into the UI.

---

## 9. Page shell — consistent structure

```
Page title
Short description / context
Actions
─────────────────────────────
Filters / controls
─────────────────────────────
Content
```

Example:

```
Clients

Manage organizations using Verity
and configure their platform access.

[ + New Client ]

────────────────────────────────────

[ Search clients ] [ Status ▾ ]

┌──────────────────────────────────┐
│ Client list                      │
└──────────────────────────────────┘
```

**Do not turn every page into five KPI cards + a giant chart + six cards + a table.** Steep's
restraint carries through: composition and whitespace, not density for its own sake.

---

## 10. Content scrolling

The shell owns the viewport. Content areas scroll internally.

```
┌──────────────────────────────────────────┐
│ filters                                  │
├──────────────────────────────────────────┤
│ table                                    │
│   row                                    │
│   row                                    │
│   ↕                                      │
├──────────────────────────────────────────┤
│ Showing 1–50 of 1,283        1 2 3 …     │
└──────────────────────────────────────────┘
```

The browser window must not scroll endlessly. The reference boards confirm the target: the table is
**paginated** — "Showing 1 to 4 of 128 items", pages 1 · 2 · 3 · … · 32.

Scroll ownership is decided **per page** and recorded. Do not force every page into a fixed-height
container either — a short settings form should not sit in a scroll region that never scrolls.

---

## 11. Breadcrumb / context

```
Clients
    ↓
Kent's Restaurant
    ↓
People
```

And when an operator has entered a tenant:

```
VERITY HQ

Kent's Restaurant
● Tenant context active

People
```

**Zero ambiguity about which client the operator is currently operating on.**

---

## 12. Global vs tenant context indicator

Part of the shell **before** the cross-tenant machinery is built.

Global:

```
┌──────────────────────────────┐
│ 🌐 VERITY HQ                 │
│ Global platform context      │
└──────────────────────────────┘
```

Inside a client:

```
┌──────────────────────────────┐
│ ● Kent's Restaurant          │
│ Tenant context               │
└──────────────────────────────┘
```

The operator always knows whether they are in **Global HQ** or **inside Client X**, and changing
context is an **explicit action**.

> **This is a security UX feature, not decoration.** It is the visible half of ADR-013's
> requirement that tenant context be explicit, never ambient — and it must not be presented as
> working before the security model behind it exists.

---

## 13. Glass usage

Selective, per the retained four-class system.

**Appropriate:** sidebar active state · operator profile card · floating command/search · dashboard
summary surfaces · contextual panels · the tenant-context indicator.

**Avoid:**

```
glass page → glass section → glass card → glass card inside card → glass table
```

The shell needs **depth**, not visual noise.

---

## 14. Overview page — small scope

First real HQ page, deliberately minimal:

```
Good evening.

Verity HQ
Platform overview and operational status.

┌──────────┐ ┌──────────┐ ┌──────────┐
│ Clients  │ │ People   │ │ Modules  │
│ …        │ │ …        │ │ …        │
└──────────┘ └──────────┘ └──────────┘

Recent activity
──────────────────────────────────
```

**No fake demo metrics.** Numbers exist only once backed by real data; where data is unavailable,
use a proper empty state. This matches the standard the existing shell already meets — the two
zeros on the current overview are real zeros.

---

## 15. Explicitly NOT in the HQ shell

Inventory · CRM · Finance · HR · Billing · Procurement · Manufacturing · restaurant functionality ·
client-specific modules · arbitrary SaaS features.

Those belong to client/module architecture, not the foundational shell. **No navigation entry for
anything that does not exist.**

Note for Phase 1: the reference boards render an *Inventory* screen. That is a **composition
reference only** — stat row, wide panel, filter bar, paginated table. The domain is not to be built.

---

## 16. What the shell must prove

### Visual
Verity brand identity · `#00D1B2` accent · light and dark · glass · gradients · correct typography ·
proper spacing · premium visual hierarchy.

### UX
Fixed shell · no unnecessary body scrolling · contained page scrolling · sidebar scrolls only when
required · **no sidebar scroll when content fits** · responsive behaviour · keyboard navigation ·
focus states.

### Security UX
Clear HQ identity · clear operator identity · clear global/tenant context · no ambiguous tenant
switching.

### Architecture
Navigation is permission-aware · navigation accepts future module contributions · pages do not
bypass the command/authorization architecture · **no fake functionality**.

---

## 17. Status

**Nothing in this document has been implemented.**

Sections 3, 9, 10 and 13 are Phase 1 (shell mechanics and visual system). Sections 4, 6, 11, 12, 14
and the functional surfaces behind the navigation are Phase 2, and §12 in particular cannot ship as
working before ADR-013 defines the model it displays.

Current blocker: **Phase 0.9 FAIL**. The next implementation work is the extension reproducibility
fix and closure of Phase 0 — not this shell.
