# Brand System

Verity's product UI should feel like an operational control system: sharp, calm, premium, and built for repeated daily use.

## Brand Direction

- Scarlet accent.
- Black and steel neutrals.
- White/light surfaces where needed for readability.
- Dense but organized operational layouts.
- No decorative gradient-orb backgrounds.
- No marketing-style hero composition inside the app.

## Tagline

Operate. Automate. Evolve.

## UI Rules From AGENTS.md

- Use semantic text tokens such as `text-text-primary`, `text-text-secondary`, and `text-text-tertiary`.
- Avoid hardcoded dark text classes in components that must support dark mode.
- Avoid invalid Tailwind colors.
- Keep outer page scroll under control.
- Use bounded internal scroll for panels and lists.
- Use `items-stretch` for symmetrical dashboard/settings columns.
- Active tab pills must use `bg-[var(--brand)] text-white`.

## Module UI Rules

Every module should use shared design components and patterns:

- shared buttons,
- shared inputs,
- shared tables,
- shared badges,
- shared dialogs,
- shared empty states,
- shared loading states,
- shared page headers,
- shared dashboard metrics.

Modules should not invent unrelated visual systems.
