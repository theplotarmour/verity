-- Generated from _model/capabilities/catalog.yaml · entity variant_option
-- Tenancy mode: tenant_scoped

CREATE TABLE catalog__variant_option (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  item_id uuid NOT NULL,
  group_key text NOT NULL,
  group_label text NOT NULL,
  option_key text NOT NULL,
  option_label text NOT NULL,
  selection_rule text NOT NULL,
  selection_n integer,
  price_delta_minor bigint NOT NULL,
  price_delta_is_percent boolean NOT NULL,
  composition_delta_id uuid,
  duration_delta_minutes integer NOT NULL,
  is_default boolean NOT NULL,
  sort_weight integer NOT NULL,
  availability_schedule_id uuid
);

ALTER TABLE catalog__variant_option ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog__variant_option FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog__variant_option_tenant_isolation ON catalog__variant_option
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
