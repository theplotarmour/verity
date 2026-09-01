# Atmosphere & card visual options — pick one, or mix

Not implemented. Written for you to choose from; each option is independent
and can be combined with any other. Grounded in the current code
(`src/app/globals.css`, `.verity-atmosphere`) and the two identity
references: `verity-app-ui-mockups/content_dark.png` / `content.png`
(near-black/near-white canvas, accent used sparingly and precisely) versus
the live app's own current look (deep, fully-tinted canvas — bolder than
the reference boards).

## A. Background approach — pick one

### A1. Near-zero canvas glow, all the color moves to the cards (your suggestion)
Canvas drops back to close to flat `--color-canvas` (barely any atmosphere
glow at all). Every stat card instead gets its own small, contained accent
glow — a soft radial bloom seeded from one corner of the card, or a subtle
gradient wash across the card's own background. Matches the mockups'
restraint (the canvas itself is nearly inert) while still using the accent
generously — just relocated from "the room" to "the object."

- Pro: closest to the approved reference boards' actual pixels. Cheapest to
  keep accessible — a small glow behind opaque/near-opaque card content is
  far easier to keep AA-compliant than a full-bleed tinted canvas.
- Con: loses the "whole room is lit by this color" atmosphere your last
  screenshot had — it reads as calmer, more corporate, less immersive.
- Needs: a per-card treatment (see B1 below) — this option is really "A1 +
  B1" together.

### A2. Keep today's canvas approach (current code, just shipped)
Frosted glass atmosphere, top-center light source + vignette + grain,
tuned per accent. What exists right now.

### A3. Duotone, very dark, minimal glow (what you asked for "right now")
Two hue-related light sources instead of one (breaks the single-color
monotony), both turned down to a whisper, heavier blur/frost so it reads as
consistent ambient dark glass rather than a spotlight. Light theme mirrors
this as barely-there white frost. This is the version being implemented
in this same turn, below "A1–A3 decision" is moot for it — it's happening
now per your explicit instruction, independent of which of these you pick
for the *next* round.

## B. Card-level treatments — pick one or combine

### B1. Per-card accent glow (small, contained)
Each stat tile gets a soft `radial-gradient` seeded in one corner (top-left
or bottom-right of the card, not centered — same "light enters from a
corner" language the shell already uses), 40–80px blur, low alpha. Cheap,
consistent with existing `.glass-card` internals, no new dependencies.
Every card looks a little different depending on where its glow sits
relative to its content, without needing per-card manual tuning if the
corner is picked programmatically (e.g. always top-left) or varied
by a stable hash of the card's key (index / metric name) for visual
rhythm across a row.

### B2. Left accent border on the *lead* card per section
Directly from your reference screenshot: the first/primary card in each
section (Sales total, Purchase open orders, Inventory value, Receivables)
carries a `border-left: 3px solid var(--color-accent)` (or
`--accent-fill-dark`). Marks "this is the number that matters most in this
section" without adding a new color anywhere — reuses the existing accent
token. Cheapest option on this list, and orthogonal to A1/A2/A3 — works
with any of them.

### B3. Micro-visualizations per card (from the mockups)
The mockup's actual technique for "graphic and informative": every stat
card gets ONE small piece of real data visualization, not decoration —

- A sparkline / bar cluster (Orders card: pending/processing/shipped/
  delivered as four small bars, already numeric data Verity has).
- A donut/gauge ring for a single ratio (Stock overview: in-stock vs.
  low vs. out — Verity's inventory capability already has these counts).
- A tiny world/route visual only where genuinely spatial (Logistics) —
  skip this one for Verity's current scope; plywood has no shipment-route
  data to visualize honestly, and a decorative map would be exactly the
  "sparklines standing in for content" pattern `impeccable`'s craft floor
  refuses.

This is the highest-effort, highest-payoff option — it's what actually
makes the mockup's cards feel "inviting" rather than a stat-and-label list
with a nicer background. Needs real chart components (Recharts is already
a discovered-but-unused capability per the codebase; would need adding).

### B4. Product/context imagery on relevant cards
The mockup's "Reorders" card carries a real product photo. Verity has no
equivalent today (plywood boards aren't individually photographed), so this
one is marked for a *future* client that has photographable inventory —
not actionable for the plywood/Shree Ganesh scope now. Listed for
completeness only.

## C. Full mockup replication — pick if you want pixel-parity, not a variation

Rather than choosing pieces above, adopt the mockup's system wholesale:
near-black/near-white canvas (no atmosphere glow at all beyond what a
`.glass-shell`/`.glass-card` naturally show), accent reserved for: active
nav pill (solid fill, already has the token infra — `accent-fill-dark`/
`accent-ink-dark` in `accent.ts`), one ring/gauge chart per relevant card,
status dots, and the primary CTA button. This is the most disciplined
option and the most different from where the app is today — effectively
reverting the last several sessions' "amplify the glass" direction back
toward the original ADR-011 restraint. Only choose this if the richer
direction the app has been moving toward was a wrong turn, not a
still-in-progress one.

## Recommendation, not a decision

B2 (left border on lead cards) is close to free and worth doing regardless
of which background option wins — it's cheap, accent-token-driven, and
already validated by your own reference screenshot. B1 or B3 is the real
fork: B1 if you want "inviting" from color alone and want it soon, B3 if
you want "inviting" from actual information density and are OK with the
added chart-library work. A1 vs A2 vs A3 is a mood call (calm/corporate vs.
immersive vs. dark-and-quiet) more than a craft one — none of the three are
wrong, they read differently.
