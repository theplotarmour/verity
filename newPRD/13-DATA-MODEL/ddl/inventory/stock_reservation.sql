-- Generated from _model/capabilities/inventory.yaml · entity stock_reservation
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE inventory__stock_reservation (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  item_ref uuid NOT NULL,
  location_id uuid NOT NULL,
  quantity numeric(18,4) NOT NULL,
  unit_of_measure text NOT NULL,
  source_capability_key text NOT NULL,
  source_ref uuid NOT NULL,
  reserved_at timestamptz NOT NULL,
  expires_at timestamptz,
  consumed_movement_id uuid,
  released_reason text
);

ALTER TABLE inventory__stock_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory__stock_reservation FORCE ROW LEVEL SECURITY;
CREATE POLICY inventory__stock_reservation_tenant_isolation ON inventory__stock_reservation
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reserved_at: immutable after create; enforced by trigger, not by application code
