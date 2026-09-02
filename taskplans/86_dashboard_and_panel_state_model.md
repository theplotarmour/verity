# Task 86 — Dashboard & panel state model

Authority: `erpclaw-prd/01-information-architecture-and-pages.md` §2.4
(Dashboard States). User synthesis, 2026-09-03, item 8 (independent
dashboard sections) — merged in here rather than split out, since it's
the same concept applied at panel granularity.

## Status: PENDING — genuinely new gap

## What's missing

Verity's Overview page has no named state machine. ERPClaw's model, worth
adopting directly: **Empty/first-setup** (nothing configured, show setup
steps not a blank grid), **Operational** (normal), **Attention** (N things
need it — see Task 90, which this should consume rather than duplicate),
**Degraded** (some sections loaded, one didn't — inventory shows, finance
failed to load), **System failure** (can't reach the database at all).

The second half: each KPI/panel fetches and fails **independently**. A
failing finance query must not blank the whole Overview page — the
sales/inventory panels that loaded successfully still render, and the
failed one shows its own inline error, not a page-level crash.

## Scope

- A named state per dashboard/section, not just "loading/error/data".
- Per-panel fetch isolation on the Overview page specifically — check
  current implementation before assuming it needs changing; may already
  be closer to this than expected.

## Trigger to start

Whenever Overview page work is next touched, or when Task 90 (Attention)
is built, since Attention state depends on this model existing.
