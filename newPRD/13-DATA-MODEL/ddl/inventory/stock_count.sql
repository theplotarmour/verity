-- Generated from _model/capabilities/inventory.yaml · entity stock_count
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE inventory__stock_count (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  location_id uuid NOT NULL,
  count_kind text NOT NULL,
  scope_item_refs jsonb,
  snapshot_at timestamptz NOT NULL,
  expected_lines jsonb NOT NULL,
  counted_by_principal_id uuid,
  counted_at timestamptz,
  reviewed_by_principal_id uuid,
  blind boolean NOT NULL,
  variance_value_minor bigint,
  variance_line_count integer,
  approved_at timestamptz
);

ALTER TABLE inventory__stock_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory__stock_count FORCE ROW LEVEL SECURITY;
CREATE POLICY inventory__stock_count_tenant_isolation ON inventory__stock_count
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- snapshot_at: immutable after create; enforced by trigger, not by application code
