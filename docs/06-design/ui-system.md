# UI System

Verity UI is an operational workspace, not a landing page.

## Layout

- Prefer dense, scannable layouts.
- Keep cards at 8px radius or less unless existing components require otherwise.
- Do not put cards inside cards.
- Use full-width sections or unframed layouts for page structure.
- Keep tables and queues optimized for repeated work.
- Ensure text never overlaps or overflows controls.

## Controls

- Use icons for common toolbar actions.
- Use segmented controls for mode switching.
- Use toggles/checkboxes for binary settings.
- Use menus for option sets.
- Use tabs for peer views.
- Use tables for comparison and operational lists.
- Use dialogs for contained confirmation or editing flows.

## States

Each module surface needs:

- empty state,
- loading state,
- unauthorized state,
- disabled-module state,
- read-only subscription state,
- validation error state,
- destructive-action confirmation.

## Responsiveness

Desktop should prioritize scanning and throughput. Mobile should prioritize role-specific tasks and fast action.
