-- ---------------------------------------------------------------------------
-- Order states must be state KEYS, and the database now says so
--
-- Reported: "when I try to cancel an order, it says Unknown state Processing
-- for verity.plywood.sales_order."
--
-- One row, SO-2026-GANESH-01, carried the state 'Processing'. That is not a
-- state key — it is the DISPLAY LABEL for one, from
-- src/components/ui/business/states.ts — and no command in this capability can
-- produce it. It was written directly, bypassing the command path, when the
-- demo data was seeded.
--
-- The consequence is worse than a wrong word on screen. Every transition is
-- resolved by looking the current state up in the capability's state machine,
-- so an unrecognised value makes the order PERMANENTLY UNACTIONABLE: it cannot
-- be dispatched, cancelled, or completed, and each attempt fails with an error
-- about the platform rather than about the order. The order is stuck and
-- nothing on the screen explains why.
--
-- Two changes: correct the row, and make the class of fault impossible.
--
-- The row had 50 ordered, 0 shipped and no live reservation, so its honest
-- state is 'approved' — taken, not yet held, not yet gone.
-- ---------------------------------------------------------------------------

UPDATE "plywood_sales_order" SET "state" = 'approved' WHERE "state" = 'Processing';

-- A CHECK constraint rather than an application guard, because the application
-- guard already existed and this row got in anyway: it was written by a seed
-- that never called a command. Only the database sees every writer.
--
-- These sets are closed for this capability and are the same keys the state
-- machines declare. Adding a state means changing both, deliberately, in one
-- commit — which is the point. A capability that wants an open-ended state set
-- would not put its states in a column with a CHECK, and this one does not want
-- that: an unrecognised state here is always a bug, never an extension.
ALTER TABLE "plywood_sales_order"
  ADD CONSTRAINT "plywood_sales_order_state_is_a_key"
  CHECK ("state" IN ('draft', 'pending_credit', 'approved', 'dispatching', 'completed', 'cancelled'));

ALTER TABLE "plywood_purchase_order"
  ADD CONSTRAINT "plywood_purchase_order_state_is_a_key"
  CHECK ("state" IN ('draft', 'submitted', 'receiving', 'completed', 'cancelled'));
