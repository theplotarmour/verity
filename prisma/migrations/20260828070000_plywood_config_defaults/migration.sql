-- ---------------------------------------------------------------------------
-- Plywood capability configuration defaults
--
-- Discovery, not policy. Nobody can guess `verity.plywood.tax.cgst_rate_bp` from
-- a blank text box, and a capability that reads configuration nobody can find is
-- a capability that cannot be set up. These rows put the keys on the
-- Configuration screen as platform defaults, where a tenant can see them and
-- override them.
--
-- RATES ARE DEFAULTS; THE STATE CODE IS NOT SET.
-- 9% + 9% intra-state and 18% inter-state is the ordinary GST rate for the HSN
-- 4412 range these boards fall under, and it is the capability's default rather
-- than a rule — a tenant whose accountant says otherwise overrides it.
--
-- `verity.plywood.tax.state_code` is deliberately absent. There is no default
-- state for a business, and inventing one would tax every invoice as intra-state
-- until somebody noticed. `raiseSalesInvoice` refuses with a named error until it
-- is set, which is the honest failure.
--
-- Basis points throughout: 2.5% is 250. A percentage stored as a float is a
-- rounding error waiting for a filing.
-- ---------------------------------------------------------------------------

INSERT INTO "config_parameter" (id, tenant_id, key, scope, scope_id, value, updated_at)
VALUES
  (gen_random_uuid(), NULL, 'verity.plywood.tax.cgst_rate_bp', 'Global', NULL, '900'::jsonb,  now()),
  (gen_random_uuid(), NULL, 'verity.plywood.tax.sgst_rate_bp', 'Global', NULL, '900'::jsonb,  now()),
  (gen_random_uuid(), NULL, 'verity.plywood.tax.igst_rate_bp', 'Global', NULL, '1800'::jsonb, now())
ON CONFLICT DO NOTHING;
