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

Authority: `Bible V4 §1` (UX Constitution), `ADR-024` (material/accent/motion), `ADR-025`
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
