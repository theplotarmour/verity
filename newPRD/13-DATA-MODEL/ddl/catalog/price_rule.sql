-- Generated from _model/capabilities/catalog.yaml · entity price_rule
-- Tenancy mode: tenant_scoped

CREATE TABLE catalog__price_rule (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  item_id uuid,
  category_id uuid,
  scope_kind text NOT NULL,
  scope_ref uuid,
  currency text NOT NULL,
  amount_minor bigint,
  percent_of_list numeric(18,4),
  min_quantity numeric(18,4),
  max_quantity numeric(18,4),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  precedence integer NOT NULL,
  tax_inclusive boolean NOT NULL,
  rounding_rule text NOT NULL,
  source text NOT NULL
);

ALTER TABLE catalog__price_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog__price_rule FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog__price_rule_tenant_isolation ON catalog__price_rule
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
