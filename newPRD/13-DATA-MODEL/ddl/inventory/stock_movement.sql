-- Generated from _model/capabilities/inventory.yaml · entity stock_movement
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE inventory__stock_movement (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  item_ref uuid NOT NULL,
  from_location_id uuid,
  to_location_id uuid,
  quantity numeric(18,4) NOT NULL,
  unit_of_measure text NOT NULL,
  movement_kind text NOT NULL,
  reason_key text NOT NULL,
  reason_note text,
  source_capability_key text,
  source_ref uuid,
  unit_cost_minor bigint,
  batch_ref text,
  expires_on date,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL,
  actor_principal_id uuid NOT NULL,
  evidence_ref text,
  reverses_movement_id uuid,
  count_id uuid
);

ALTER TABLE inventory__stock_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory__stock_movement FORCE ROW LEVEL SECURITY;
CREATE POLICY inventory__stock_movement_tenant_isolation ON inventory__stock_movement
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- item_ref: immutable after create; enforced by trigger, not by application code
-- from_location_id: immutable after create; enforced by trigger, not by application code
-- to_location_id: immutable after create; enforced by trigger, not by application code
-- quantity: immutable after create; enforced by trigger, not by application code
-- unit_of_measure: immutable after create; enforced by trigger, not by application code
-- movement_kind: immutable after create; enforced by trigger, not by application code
-- reason_key: immutable after create; enforced by trigger, not by application code
-- reason_note: immutable after create; enforced by trigger, not by application code
-- source_capability_key: immutable after create; enforced by trigger, not by application code
-- source_ref: immutable after create; enforced by trigger, not by application code
-- unit_cost_minor: immutable after create; enforced by trigger, not by application code
-- batch_ref: immutable after create; enforced by trigger, not by application code
-- expires_on: immutable after create; enforced by trigger, not by application code
-- occurred_at: immutable after create; enforced by trigger, not by application code
-- recorded_at: immutable after create; enforced by trigger, not by application code
-- actor_principal_id: immutable after create; enforced by trigger, not by application code
-- evidence_ref: immutable after create; enforced by trigger, not by application code
-- reverses_movement_id: immutable after create; enforced by trigger, not by application code
-- count_id: immutable after create; enforced by trigger, not by application code
