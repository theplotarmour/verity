-- ===========================================================================
-- Second follow-up to ADR-018 (20260904180000_trading_capability_extraction,
-- 20260904190000_trading_state_definitions).
--
-- The extraction rewrote `permission.entity` and inserted the new
-- `entity_definition` rows, and the first follow-up rewrote the state machine.
-- Four registries were still left pointing at `verity.plywood.*` while the
-- code that reads them now names `verity.trading.*`. Each is CURRENT control
-- data -- what the system should do next -- not a record of what happened, so
-- each is rewritten forward. Append-only history (`activity`, `domain_event`,
-- `evidence`, `sla_clock`) is still deliberately untouched.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Configuration keys. THIS IS THE LOAD-BEARING ONE.
--
--    `trading/keys.ts` now names `verity.trading.tax.state_code` and the three
--    rate keys; `raiseSalesInvoice` resolves all four on every invoice. The
--    rows a live tenant actually set -- the state code above all, which has no
--    default precisely so that guessing it cannot silently tax an inter-state
--    sale as intra-state -- were still filed under the plywood names, so the
--    resolver found nothing and every invoice either refused or fell back to
--    the wrong rate. Rename in place: the value is the tenant's, only the name
--    the capability reads it by changed.
-- ---------------------------------------------------------------------------

UPDATE "config_parameter" c
   SET key = replace(c.key, 'verity.plywood.tax.', 'verity.trading.tax.')
 WHERE c.key LIKE 'verity.plywood.tax.%'
   AND NOT EXISTS (
     SELECT 1 FROM "config_parameter" c2
      WHERE c2.key = replace(c.key, 'verity.plywood.tax.', 'verity.trading.tax.')
        AND c2.tenant_id IS NOT DISTINCT FROM c.tenant_id
        AND c2.scope = c.scope
        AND c2.scope_id IS NOT DISTINCT FROM c.scope_id
   );

-- ---------------------------------------------------------------------------
-- 2. `capability_definition.entity_types` for plywood.
--
--    `buildNavigation()` walks this array per active capability and shows an
--    entry where the actor holds Read. Plywood's array still listed the twenty
--    generic keys, whose permissions were renamed to `verity.trading.*` by the
--    extraction -- so every one of those entries now matches no grant and is
--    dead weight, and the trading capability's own row already carries the
--    live list. Plywood owns exactly one entity now.
-- ---------------------------------------------------------------------------

UPDATE "capability_definition"
   SET entity_types = ARRAY['verity.plywood.product_detail'],
       updated_at   = now()
 WHERE id = 'verity.capability.plywood';

-- ---------------------------------------------------------------------------
-- 3. `transition_definition.command_key`.
--
--    Copied verbatim by the state-definition follow-up, so the new
--    `verity.trading.*_order` transitions still name the commands
--    `verity.plywood.submit_purchase_order` and friends -- commands that no
--    longer exist. Nothing in `state.ts` reads this column today (the
--    transition is matched on from/to state, not on the command), which is why
--    it did not break anything; it is a registry describing which command
--    drives which transition, and a registry naming a command that cannot be
--    dispatched is a lie waiting for the first reader.
-- ---------------------------------------------------------------------------

UPDATE "transition_definition"
   SET command_key = replace(command_key, 'verity.plywood.', 'verity.trading.')
 WHERE entity_key LIKE 'verity.trading.%'
   AND command_key LIKE 'verity.plywood.%';

-- ---------------------------------------------------------------------------
-- 4. Tenant extensions of the moved entities.
--
--    A custom field or a restricted-field grant a client defined on
--    `verity.plywood.customer` is keyed by entity, and the forms and tables
--    now ask for `verity.trading.customer`. Left alone, the field simply stops
--    being rendered and the redaction stops being applied -- the second is a
--    quiet widening of what a role can see, which is the worse half. Both
--    tables are usually empty; the guards make the rewrite a no-op when they
--    are, and safe when they are not.
--
--    `entity_key` is an FK into `entity_definition`; the extraction left the
--    old `verity.plywood.*` rows in place and inserted the new ones, so both
--    sides of this rewrite resolve.
-- ---------------------------------------------------------------------------

UPDATE "custom_field_schema" c
   SET entity_key = replace(c.entity_key, 'verity.plywood.', 'verity.trading.')
 WHERE c.entity_key IN (
         'verity.plywood.brand', 'verity.plywood.product',
         'verity.plywood.supplier', 'verity.plywood.supplier_price',
         'verity.plywood.customer', 'verity.plywood.customer_price',
         'verity.plywood.purchase_order', 'verity.plywood.purchase_order_line',
         'verity.plywood.sales_order', 'verity.plywood.sales_order_line',
         'verity.plywood.reservation', 'verity.plywood.godown_rack',
         'verity.plywood.stock_ledger', 'verity.plywood.stock_balance',
         'verity.plywood.business_profile', 'verity.plywood.gst_registration',
         'verity.plywood.accounting_period', 'verity.plywood.invoice',
         'verity.plywood.payment', 'verity.plywood.ledger_entry')
   AND NOT EXISTS (
     SELECT 1 FROM "custom_field_schema" c2
      WHERE c2.tenant_id = c.tenant_id
        AND c2.entity_key = replace(c.entity_key, 'verity.plywood.', 'verity.trading.')
        AND c2.field_name = c.field_name
   );

UPDATE "field_permission" f
   SET entity_key = replace(f.entity_key, 'verity.plywood.', 'verity.trading.')
 WHERE f.entity_key IN (
         'verity.plywood.brand', 'verity.plywood.product',
         'verity.plywood.supplier', 'verity.plywood.supplier_price',
         'verity.plywood.customer', 'verity.plywood.customer_price',
         'verity.plywood.purchase_order', 'verity.plywood.purchase_order_line',
         'verity.plywood.sales_order', 'verity.plywood.sales_order_line',
         'verity.plywood.reservation', 'verity.plywood.godown_rack',
         'verity.plywood.stock_ledger', 'verity.plywood.stock_balance',
         'verity.plywood.business_profile', 'verity.plywood.gst_registration',
         'verity.plywood.accounting_period', 'verity.plywood.invoice',
         'verity.plywood.payment', 'verity.plywood.ledger_entry')
   AND NOT EXISTS (
     SELECT 1 FROM "field_permission" f2
      WHERE f2.entity_key = replace(f.entity_key, 'verity.plywood.', 'verity.trading.')
        AND f2.field_name = f.field_name
   );
