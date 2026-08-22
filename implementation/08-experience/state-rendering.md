# State Rendering & Visual Semantics

## Purpose
Ensures absolute consistency in how entity states, statuses, and SLAs are communicated visually across the entire platform.

## Scope
Color semantics, status badges, timeline markers, SLA visualizations.

## Authority
- Bible V4 - Experience Shells (CONSTITUTIONAL: Visual Color Semantics)
- AGENTS.md (Semantic Design Tokens)

## Prerequisites
- Tailwind CSS configured with semantic tokens.

## Specification Requirements
- **WHAT MUST EXIST:** Strict mapping of domain states to visual colors.
  - Green: Verified, Completed, Healthy.
  - Yellow: Pending, Draft, At Risk, Approaching Breach.
  - Red: Breached, Failed, Overdue, Blocked.
  - Blue: Active, In-Progress, Running.
- **WHAT MUST EXIST:** Consistent representation of SLA countdowns, shifting visually as they approach thresholds.

## Approved Architecture
- **Token Mapping (Authority: Bible V4):** Map status enums and SLA calculations to specific Tailwind utility classes driven by the brand palette.
- **Component Primitives (Authority: EXISTING INFRASTRUCTURE):** Create a unified `<StatusBadge>` component that encapsulates the logic for mapping state strings to color configurations.

## Implementation Contract
- Define Tailwind colors in `theme.extend.colors`:
  - `status-success`: Green
  - `status-warning`: Yellow
  - `status-danger`: Red (`#FF102A` or `#89001E`)
  - `status-active`: Blue
- Build the `<StatusBadge status={enum} />` component using `cva` or `clsx` to map the `status` prop to the correct background/text color utilities.
- For SLA visualization, implement a component that calculates time-to-breach dynamically. If `< 24h` (or defined threshold), render warning (Yellow). If `< 0`, render breached (Red).

## Constraints & Invariants
- **PRN-001:** Avoid ambiguous colors. Do not use generic gray for "Pending" if it implies action is required; use Yellow.
- **CONSTITUTIONAL:** Colors must maintain high contrast against `bg-surface`.

## Dependencies
- Depends on: Domain Entity state enums.
- Depended on by: Tables, Forms, Dashboards, Headers.

## Failure Modes
- **Inconsistent Status Colors:** Developers hardcode colors for new statuses. Mitigate by enforcing usage of the `<StatusBadge>` primitive and restricting raw color utilities in PR reviews.

## Testing Requirements
- Visual regression testing on the StatusBadge component for all enum variants.

## Conformance Checks
- Ensure no arbitrary hex codes are used for status indication outside the predefined semantic tokens.

## Traceability
- Bible V4 - Experience Shells

## Open Decisions
- None.
