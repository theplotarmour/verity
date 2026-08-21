-- Generated from _model/capabilities/assets.yaml · entity asset
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE assets__asset (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  tag text NOT NULL,
  name text NOT NULL,
  asset_class_id uuid NOT NULL,
  parent_asset_id uuid,
  path text NOT NULL,
  location_ref uuid,
  custodian_principal_id uuid,
  owning_party_ref uuid,
  serial_reference text,
  attributes jsonb,
  acquired_on date,
  acquisition_cost_minor bigint,
  expected_life_months integer,
  residual_value_minor bigint,
  disposal_on date,
  disposal_proceeds_minor bigint,
  criticality text NOT NULL,
  condition text NOT NULL,
  condition_assessed_at timestamptz,
  warranty_expires_on date,
  warranty_party_ref uuid
);

ALTER TABLE assets__asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets__asset FORCE ROW LEVEL SECURITY;
CREATE POLICY assets__asset_tenant_isolation ON assets__asset
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- tag: immutable after create; enforced by trigger, not by application code
