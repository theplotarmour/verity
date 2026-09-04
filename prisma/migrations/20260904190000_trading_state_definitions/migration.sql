-- ===========================================================================
-- Follow-up to ADR-018 (20260904180000_trading_capability_extraction).
--
-- `state_definition`/`transition_definition` were missed in the original
-- migration: they're keyed by `entity_key`, an ordinary column (not an FK
-- into `entity_definition` -- `state_definition.entity_key` IS an FK, but
-- `transition_definition.entity_key` is not), and both were seeded only
-- for the old `verity.plywood.purchase_order`/`verity.plywood.sales_order`
-- keys. Every order-lifecycle command (submit, receive, dispatch, cancel,
-- complete...) calls `assertTransitionAllowed()`, which looks states up by
-- the CURRENT entity key -- `verity.trading.purchase_order` /
-- `verity.trading.sales_order` since the previous migration -- and found
-- nothing, failing every order transition. Caught by the full test suite
-- (84 failures, all `Unknown state <x> for verity.trading.*_order`), not
-- by typecheck/lint, since this is runtime data, not code.
--
-- `verity.plywood.shipment`'s states are left alone: Stage 5 (logistics)
-- was removed in slice 2 (taskplans/45 §D-01) and nothing reads them.
-- ===========================================================================

INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal)
SELECT gen_random_uuid(), 'verity.trading.purchase_order', key, category, is_initial, is_terminal
  FROM "state_definition"
 WHERE entity_key = 'verity.plywood.purchase_order'
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal)
SELECT gen_random_uuid(), 'verity.trading.sales_order', key, category, is_initial, is_terminal
  FROM "state_definition"
 WHERE entity_key = 'verity.plywood.sales_order'
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id, command_key)
SELECT gen_random_uuid(), 'verity.trading.purchase_order', sf.id, st.id, td.command_key
  FROM "transition_definition" td
  JOIN "state_definition" old_sf ON old_sf.id = td.from_state_id
  JOIN "state_definition" old_st ON old_st.id = td.to_state_id
  JOIN "state_definition" sf ON sf.entity_key = 'verity.trading.purchase_order' AND sf.key = old_sf.key
  JOIN "state_definition" st ON st.entity_key = 'verity.trading.purchase_order' AND st.key = old_st.key
 WHERE td.entity_key = 'verity.plywood.purchase_order'
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id, command_key)
SELECT gen_random_uuid(), 'verity.trading.sales_order', sf.id, st.id, td.command_key
  FROM "transition_definition" td
  JOIN "state_definition" old_sf ON old_sf.id = td.from_state_id
  JOIN "state_definition" old_st ON old_st.id = td.to_state_id
  JOIN "state_definition" sf ON sf.entity_key = 'verity.trading.sales_order' AND sf.key = old_sf.key
  JOIN "state_definition" st ON st.entity_key = 'verity.trading.sales_order' AND st.key = old_st.key
 WHERE td.entity_key = 'verity.plywood.sales_order'
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
