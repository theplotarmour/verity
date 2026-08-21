-- Generated from _model/capabilities/catalog.yaml · entity composition
-- Tenancy mode: tenant_scoped

CREATE TABLE catalog__composition (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  parent_item_id uuid NOT NULL,
  version_number integer NOT NULL,
  components jsonb NOT NULL,
  output_quantity numeric(18,4) NOT NULL,
  output_unit_of_measure text NOT NULL,
  max_depth_resolved integer NOT NULL,
  effective_from timestamptz NOT NULL,
  notes text
);

ALTER TABLE catalog__composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog__composition FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog__composition_tenant_isolation ON catalog__composition
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
