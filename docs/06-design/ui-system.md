# UI System

Verity's UI is a premium, responsive operational workspace designed for maximum throughput and aesthetic excellence.

## Layout & Aesthetics

- **Fluid Geometry:** Use `rounded-[24px]` or `rounded-[32px]` for major containers, dashboards, and card widgets. Small buttons and active pill controls should use `rounded-full` or `rounded-[16px]`.
- **Soft Layering:** Cards should not use hard borders unless required for specific contrast. Instead, use soft drop shadows (`shadow-[0_12px_40px_rgba(0,0,0,0.03)]`) and card-on-card grouping utilizing background shades (`bg-surface-elevated` or matching gradients).
- **Responsive Dashboard Columns:** Dashboard widgets should stretch symmetrically (`items-stretch`) to form a cohesive grid, avoiding awkward alignment gaps.
- **Symmetric Spacing:** Maintain generous padding (usually `p-6` or `p-8`) inside cards to let content breathe, keeping typographic contrast crisp.

## Hero Metric Cards

For the one or two numbers a dashboard leads with, `Metric` takes a `hero`
prop: a filled Scarlet-to-Deep-Red gradient card (`from-[var(--accent)]
to-[var(--accent-deep)]`), white text, and a static radial glow in the corner
drawn from the same gradient family as the `.verity-glass` cursor glow —
`accent-deep` blurred at the edge, so the emphasis reads as this app's
language and not a borrowed palette.

Reserve it for the single stat that matters most on that screen (occupancy,
today's revenue, orders overdue). Filling every card this way turns emphasis
into wallpaper — the rest of the grid stays the quiet bordered tile
(`Metric` without `hero`). See `RestaurantMetricsWidget`'s `Tables` card for
the reference usage.

## Controls & Interaction

- **Pill Segmented Controls:** Active mode selection, tabs, and filters should use rounded pill shapes (`rounded-full`) with active states filled in Scarlet Red (`bg-[var(--brand)] text-white`).
- **Interactive Indicators:** Elements like online users, status signals, or checklist progress badges should use circular/dot indicators overlaying profile avatars.
- **Action Prompts:** Use clean, minimal icons inside secondary action buttons, styled as circular action controls to keep screen clutter minimal.

## Responsiveness & Viewports

- **Desktop Layout:** Features sidebars with bounded scroll areas (`overflow-y-auto`) and twin-column information hubs that fill the viewport cleanly without causing primary layout shifts or global scrolling.
- **Mobile Adaptability:** Layouts collapse into vertical stacks with fluid, full-width rounded cards that scale dynamically based on screen width.

