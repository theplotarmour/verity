# Verity Master Platform Specification

## 09_experience/design-system.md

## Provenance
*   **Primary Sources**: `SOURCE_UNAVAILABLE`
*   **Verity Bible Authority**: `verity-bible/volume_5_operations_security.md`
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Brand Tokens And Layouts Colors Specification

This document details the `experience` system specifications for `Design System`.

### REQ-EXPERIENCE-DESIGNSYSTEM-001
*   **Requirement**: The system utilizes `base` core patterns for `brand tokens and layouts colors`.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

### REQ-EXPERIENCE-DESIGNSYSTEM-002
*   **Requirement**: Operational metrics and logs are scoped by `tenant_id` at the database middleware layer.
*   **Status**: `[INFERRED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-003
*   **Requirement**: Actions must publish change logs to the Event Bus on commit.
*   **Status**: `[UNKNOWN_REASON: FUTURE_CAPABILITY]`

---

## 2. Apple-Craft Component Pattern Library

Authority: `Bible V4 §1` (UX Constitution), `ADR-024` (accent/motion), `ADR-025` (patterns), `ADR-026`
(the six named component patterns below). Task 115.

### REQ-EXPERIENCE-DESIGNSYSTEM-004
*   **Requirement**: A page offering a single most-likely creation action alongside two or
    more related creation commands uses the split primary action pattern (filled button +
    attached chevron opening a menu of the related commands) rather than a bare button plus
    a separate menu trigger.
*   **Authority**: `ADR-025` pattern 1 (split primary action).
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-005
*   **Requirement**: A metric tile displays an accent-tinted icon chip, label, value, and
    delta-vs-prior-period together, with an optional per-tile overflow control, rather than
    a bare number-and-label pair.
*   **Authority**: `ADR-025` pattern 2 (icon-chip stat tile).
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-006
*   **Requirement**: The active tenant/organization identity is presented as a bordered card
    at the shell's structural foot (sidebar or equivalent), not only as a bare dropdown
    trigger in the masthead.
*   **Authority**: `ADR-025` pattern 3 (workspace-switcher card).
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-007
*   **Requirement**: A chart card exposes every plotted series' exact value at the pointer's
    hovered position via a live tooltip, rather than requiring a separate legend lookup.
*   **Authority**: `ADR-025` pattern 4 (chart card with live tooltip).
*   **Status**: `[UNKNOWN_REASON: NOT_YET_BUILT]` — no line/area chart component exists in
    the codebase to bind this requirement to; tracked in `taskplans/115_apple_design_system_
    governing_docs_overhaul.md`.

### REQ-EXPERIENCE-DESIGNSYSTEM-008
*   **Requirement**: A filterable row list (tasks, work queues, and similar) exposes its
    filters as count-chips above the list, using one shared chip-row primitive rather than
    a page-local implementation.
*   **Authority**: `ADR-025` pattern 5 (filter-chip rows).
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-009
*   **Requirement**: The AI assistant's empty/idle state offers suggested prompts as
    full-width tappable rows that populate (not auto-send) the input, rather than a bulleted
    list of examples.
*   **Authority**: `ADR-025` pattern 6 (AI-assistant suggested-prompt rows).
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-015
*   **Requirement**: Ordinary cards and panels use the shared layered glass material with
    atmospheric color, translucent gradient, blur, edge light and controlled elevation. Dense
    tables, forms, long-form text and destructive confirmation may use the shared opaque
    material when it improves reading or decision safety; individual rows, badges and status
    dots never receive glass blur.
*   **Authority**: `ADR-026` (layered glass content surfaces and visual field).
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-016
*   **Requirement**: The visual field uses the configurable accent seed and semantic tokens for
    color, supports light/dark parity, preserves WCAG AA, and honors reduced-motion and
    reduced-transparency preferences. Visual anchors such as charts, icon chips, atmospheric
    fields and empty states must reinforce the page's operational purpose.
*   **Authority**: `ADR-026` (layered glass content surfaces and visual field).
*   **Status**: `[DECIDED]`

---

## 3. Operational Interaction Grammar

This section turns the visual system into a repeatable operating grammar. It
draws workflow structure from Odoo's record, list, search, and activity views,
but it does not import Odoo's XML engine or reproduce its UI literally. Verity
uses familiar business-software patterns with Apple-style restraint: clear
hierarchy, direct manipulation only where a write is safe, generous touch
targets, quiet surfaces, and one obvious next action.

### REQ-EXPERIENCE-DESIGNSYSTEM-010
*   **Requirement**: A workspace page presents one clear title, optional contextual explanation, record state where relevant, and the single most likely next action before secondary commands. Secondary, destructive, or terminal commands are progressively disclosed and remain capability-guarded.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-011
*   **Requirement**: A record detail keeps its overview and next action visible before related information. Related entities, history, and collaboration use labelled tabs or bounded panels; they must not become an unstructured, endlessly-scrolling form.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-012
*   **Requirement**: Collection views use the shared table/list grammar: identity-first rows, a local filter when the visible collection is large enough to need it, explicit sorting, pagination or a bounded viewport, a named empty state, and an available first-create path. Role and team scopes are resolved server-side; client filters only refine records already safe to show.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-013
*   **Requirement**: A form control has a persistent label, one clear control, optional concise help, and an adjacent textual validation error. Controls use the shared `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, and combobox primitives; placeholder text is not a label. Standard editable controls provide a minimum 44px target and the shared focus treatment.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-014
*   **Requirement**: A native-style select is reserved for short, fixed, immediately scannable choices. A searchable combobox is used for people, organizations, large taxonomies, or choices that require filtering. Both expose their current value, keyboard operation, disabled state, and a consistent focus/error treatment.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-015
*   **Requirement**: A write has an explicit commit affordance and a visible pending, success, or failure outcome. Cancel does not mutate state; destructive or irreversible operations require a confirmation that names their consequence. UI affordance never substitutes for server authorization or workflow validation.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-016
*   **Requirement**: Loading, empty, degraded, denied, and error states explain what happened and offer only a safe next step. A screen must not present a silent blank area as if the user has no records or no permission.
*   **Status**: `[DECIDED]`

### REQ-EXPERIENCE-DESIGNSYSTEM-017
*   **Requirement**: A collection-view row for an entity with a lifecycle state exposes its obvious next-state action inline (e.g. Approve, Cancel, Adjust), not only from a separate action screen the operator must re-find the same record on.
*   **Status**: `[PROPOSED]` — Task 121, awaiting the same ratification pass as REQ-010..016; do not treat as enforceable until re-marked `[DECIDED]`.

### REQ-EXPERIENCE-DESIGNSYSTEM-018
*   **Requirement**: Any entity holding a counterparty relationship (customer, supplier, dealer, or an equivalent party-like entity in a future capability) exposes a running ledger/statement view — generalizing the pattern already built in `src/app/(shell)/ledgers/LedgerView.tsx` platform-wide via a shared query/component, not left to each capability to reinvent or omit.
*   **Status**: `[PROPOSED]` — Task 121, awaiting ratification.

### REQ-EXPERIENCE-DESIGNSYSTEM-019
*   **Requirement**: A record meant to leave the system to an external party (an invoice, a purchase order, a certificate) has a print/PDF path. A CSV/data export alone does not satisfy this — the recipient is assumed to want a document, not a spreadsheet.
*   **Status**: `[PROPOSED]` — Task 121, awaiting ratification.
