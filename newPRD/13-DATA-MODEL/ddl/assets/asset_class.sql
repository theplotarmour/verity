-- Generated from _model/capabilities/assets.yaml · entity asset_class
-- Tenancy mode: tenant_scoped

CREATE TABLE assets__asset_class (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  parent_class_id uuid,
  required_attribute_keys jsonb,
  meter_definitions jsonb,
  default_plan_ids jsonb,
  depreciation_method text NOT NULL,
  default_life_months integer,
  warranty_default_months integer,
  criticality_default text NOT NULL,
  source_pack_key text
);

ALTER TABLE assets__asset_class ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets__asset_class FORCE ROW LEVEL SECURITY;
CREATE POLICY assets__asset_class_tenant_isolation ON assets__asset_class
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
