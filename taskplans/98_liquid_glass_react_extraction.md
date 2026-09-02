# Task 98 — `liquid-glass-react` extraction assessment

Authority: `D:\Code\R&D\liquid-glass-react` (cloned 2026-09-03,
`github.com/rdev/liquid-glass-react`), read in full (`README.md`,
`src/index.tsx`, 612 lines). ADR-011 (glass material system).

## Status: PENDING — reference material, not a build. One narrow candidate
identified, everything else explicitly rejected.

## What it actually does

Real refraction, not a blur trick. A procedurally generated displacement
map feeds three separate `feDisplacementMap` passes (one per RGB channel,
each offset slightly — that's the chromatic-aberration effect), recombined
and blurred, with the whole thing re-tracking mouse position for an
"elastic" bend toward the cursor. This is mechanically different from
Verity's current glass, which is `backdrop-filter: blur() saturate()
brightness()` — a real optical property (light bending at an edge) versus
a filter approximation of one.

## Why this is not going into `.glass-card`/`.glass-shell`

- **Performance.** Mouse-tracking elasticity means a mousemove listener and
  React state per glass instance. `.glass-card` renders per row in dense
  tables (Purchases, Stock, Transactions) — Task 81's own error-taxonomy
  and ADR-011's own constraint 2 ("blur on FOUR surface kinds at most —
  shell, card, control, overlay — never per row") already forbid exactly
  this shape of cost. A technique requiring live JS per element is a
  harder version of the thing ADR-011 already capped.
- **Safari/Firefox degrade to no displacement** (the README says so
  directly) — Verity has no committed browser-support floor stated, but a
  material effect that's real in one engine and silently absent in two is
  a worse default than the current CSS-only approach, which degrades
  gracefully everywhere `backdrop-filter` ships.
- **It's a component, not a token.** Verity's glass is CSS classes driven
  by `--accent-seed`/`--color-glass-*` — any component gets it for free.
  This library wraps children in a stateful React component with SVG
  filter plumbing; adopting it broadly would mean converting every
  `.glass-*` usage into a component wrapper, which is the "one client's
  need means platform primitive" anti-pattern (Task 82) pointed the other
  direction — it would make the material system MORE expensive to touch,
  not less.

## The one place it's worth a real look

A single, deliberately rare "signature moment" surface — not operational
UI. Candidates, none committed: the sign-in page's identity mark
(currently plain per its own design comment, "no gradient... the mark and
the whitespace carry the character" — a moving refraction on the mark
itself could be exactly the kind of restrained, one-authored-moment touch
`impeccable`'s craft-floor asks for, "one authored moment, not scattered
effects"), or a single hero/empty-state illustration if Verity ever ships
a marketing surface. The chromatic-aberration/displacement TECHNIQUE is
worth keeping as a reference even if this exact library is never
installed — reimplementing just the SVG filter (no mouse-tracking, no
elasticity, static edge-bend only) would be far cheaper than the full
package and might be the more honest version of "use this" for a single
static surface.

## Non-goals

- Not a dependency to add now. Nothing currently needs it.
- Not a replacement for `.glass-card`/`.glass-shell`/`.glass-control`/
  `.glass-overlay` — those stay CSS-only, per ADR-011's own performance
  constraint.
- Not evaluated against the other ~15 untouched R&D repos (`n8n`, `Zam`,
  `odoo-19.0`, a second `calcom` clone) — out of scope for this file,
  named here only so they're not mistaken for already-audited. Tasks
  02–13 already cover the twelve repos that were audited; these were not
  among them.
