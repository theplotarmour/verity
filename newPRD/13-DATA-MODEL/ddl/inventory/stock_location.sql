-- Generated from _model/capabilities/inventory.yaml · entity stock_location
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE inventory__stock_location (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  site_ref uuid,
  code text NOT NULL,
  label text NOT NULL,
  parent_stock_location_id uuid,
  path text NOT NULL,
  kind text NOT NULL,
  allows_negative boolean NOT NULL,
  counted_at timestamptz,
  custodian_principal_id uuid,
  is_valued boolean NOT NULL
);

ALTER TABLE inventory__stock_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory__stock_location FORCE ROW LEVEL SECURITY;
CREATE POLICY inventory__stock_location_tenant_isolation ON inventory__stock_location
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- code: immutable after create; enforced by trigger, not by application code
