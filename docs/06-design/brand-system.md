# Brand System

Verity's product UI should feel like a premium, state-of-the-art operational control center: organic yet clean, high-contrast, premium, and designed for fluid daily interaction.

## Brand Direction

- **Accent color:** Scarlet Red (`#FF1D2A` or `[var(--brand)]`), used for primary call-to-actions, status alerts, active pills, and brand badges.
- **Neutrals (Light Mode):** Clean white (`#FFFFFF`) and warm light-grey surfaces (`#F4F6F9`) paired with solid black text (`#000000`).
- **Neutrals (Dark Mode):** Deep charcoal-black backgrounds (`#0B0B0C`) with elevated cards using rich warm dark-grey (`#1B1B1E`), paired with light-grey text (`#EDEDED`).
- **Organic Geometry:** High rounded corners (`rounded-[24px]` and `rounded-[32px]`) for cards, panels, and dropdown buttons.
- **Ambient Depth:** Subtle, soft shadow boundaries (`shadow-[0_12px_40px_rgba(0,0,0,0.03)]`) and delicate overlays replacing hard borders to create visual hierarchy.

## Tagline

Operate. Automate. Evolve.

## UI Rules From AGENTS.md

- Use semantic theme tokens: `text-text-primary` (resolves to dark text in light mode, light grey in dark mode), `text-text-secondary`, and `text-text-tertiary`.
- Avoid hardcoded absolute dark color classes in components.
- Bounding cards like settings configuration panels or dashboard columns to smaller heights (under 900px) is preferred.
- Use independent scrolling (`overflow-y-auto`) for inner sub-panels to keep the outer viewport static.
- Use `items-stretch` (or default grid behavior) so adjacent cards stretch to equal height.
- Toggle elements (like tab selectors) using active pills must use `bg-[var(--brand)] text-white` in their active state to avoid white-on-white text in dark mode.

## Module UI Rules

Every module must adhere to these premium design components:
- High-radii buttons and inputs,
- Borderless cards with soft shadow elevation,
- Responsive grid placements and pill-shaped widgets,
- Dense but organized tabular lists.
