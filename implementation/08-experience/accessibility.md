# Accessibility & Inclusive Design

## Purpose
Establishes the technical requirements and implementation patterns to ensure the Verity platform is usable by all individuals, complying with standard accessibility guidelines.

## Scope
Semantic HTML, keyboard navigation, screen reader support, focus management, color contrast, and motion reduction.

## Authority
- UX Constitution (Visual restraint, clarity)
- PRN-001: Least Surprise

## Prerequisites
- Semantic design tokens defined in Tailwind.

## Specification Requirements
- **WHAT MUST EXIST:** All interactive elements must be accessible via keyboard navigation.
- **WHAT MUST EXIST:** Meaningful visual focus indicators for keyboard users.
- **WHAT MUST EXIST:** High-contrast text and UI elements adhering to semantic tokens.
- **WHAT MUST EXIST:** Respect for user operating system preferences regarding motion (`prefers-reduced-motion`).

## Approved Architecture
- **Semantic HTML (Authority: Web Standards):** Strict adherence to native HTML elements (`<button>`, `<a>`, `<nav>`, `<main>`) over ARIA-patched `<div>` elements wherever possible.
- **Styling (Authority: EXISTING INFRASTRUCTURE):** Use Tailwind's `focus-visible:` utilities to style focus rings predictably. Use `motion-safe:` and `motion-reduce:` variants for animations.

## Implementation Contract
- Ensure all custom interactive components (e.g., custom dropdowns) implement complete keyboard event handling (Space, Enter, Escape, Arrow keys).
- Apply `focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:outline-none` globally to interactive elements.
- Ensure form inputs are properly linked to labels using `htmlFor` and `id`.
- For dynamic status updates (like offline sync completion), utilize an `aria-live="polite"` region to notify screen readers without stealing focus.
- Validate color contrast using the semantic palette (ensure `text-text-secondary` meets a minimum 4.5:1 ratio against `bg-surface`).

## Constraints & Invariants
- **CONSTITUTIONAL:** Never suppress focus outlines (`outline: none`) without providing a distinct custom `focus-visible` alternative.
- Do not use color as the *only* visual means of conveying information (e.g., a status badge must include text or an icon in addition to its Green/Red color).

## Dependencies
- Depends on: Core UI components.
- Depended on by: Entire application surface.

## Failure Modes
- **Focus Traps:** Modals or drawers fail to trap focus, allowing keyboard users to interact with obscured background elements. Mitigate using a reliable focus-trap utility/hook for all overlays.

## Testing Requirements
- Automated accessibility testing via `axe-core` (or equivalent) in CI pipeline.
- Manual keyboard-only navigation tests for critical paths (Work Order intake).

## Conformance Checks
- Linting for missing `alt` attributes on images and missing `aria-labels` on icon-only buttons.

## Traceability
- UX Constitution
- PRN-001

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Selection of an automated accessibility auditing tool for the CI pipeline (e.g., `eslint-plugin-jsx-a11y`, `@axe-core/playwright`).
- **IMPLEMENTATION DECISION REQUIRED:** Exact WCAG compliance target level (assumed AA, but needs formal product confirmation).
