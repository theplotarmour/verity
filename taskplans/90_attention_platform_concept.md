# Task 90 — "Attention": a platform-wide exceptions concept

Authority: User synthesis, 2026-09-03, item 9 (their own numbering;
extends `erpclaw-prd/01-information-architecture-and-pages.md` §2.4's
"Warning state" into a standing product concept rather than a dashboard
mood).

## Status: PENDING — genuinely new gap, platform-primitive-shaped

## What's missing

Every capability accumulates things that need a human: overdue, blocked,
awaiting approval, a reconciliation difference (Task 88), missing
required information, a failed automation, an expiring document/item, or
unusual activity worth a look. Today each of these is discoverable only
inside its own capability's own screen. The proposal: a single contributed
"Attention" feed, the same shape as the existing workspace-contribution
pattern (`CLAUDE.md`'s "capability contributions" — a capability declares
*where* it appears, never how to draw its page) — each capability
contributes attention items in one shared shape, one shared surface
renders all of them.

## Scope

- A contribution point (`AttentionContribution` or similar), parallel to
  the existing dashboard/navigation contribution pattern — NOT a new
  entity registry, a new query shape over what capabilities already track.
- Consumed by Task 86's dashboard "Attention" state and by whatever
  surfaces a cross-capability "what needs me today" view.

## Trigger to start

This is a genuine platform-primitive candidate, which per `CLAUDE.md`'s
own Authorization/Identity precedent likely wants an ADR before the
contribution shape is finalized — classify as **requires ADR** if picked
up, not as ready-to-build. Two real capabilities each independently
wanting this (plywood likely already has 3+ candidate attention sources:
overdue receivables, pending goods issue, low stock) is the trigger to
write that ADR.

## Non-goals

- Not a new notification/alerting delivery mechanism — Verity's
  notification substrate (`notification.ts`, already built) is a
  different concern (push/delivery); this is a read surface.
