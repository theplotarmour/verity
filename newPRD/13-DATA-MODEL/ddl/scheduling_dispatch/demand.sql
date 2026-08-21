-- Generated from _model/capabilities/scheduling_dispatch.yaml · entity demand
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE scheduling_dispatch__demand (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  source_capability_key text NOT NULL,
  source_ref uuid NOT NULL,
  location_ref uuid,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  is_window_flexible boolean NOT NULL,
  required_qualification_keys jsonb NOT NULL,
  required_count integer NOT NULL,
  priority text NOT NULL,
  recurrence_id uuid,
  cost_ceiling_minor bigint,
  cancellation_deadline_at timestamptz
);

ALTER TABLE scheduling_dispatch__demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_dispatch__demand FORCE ROW LEVEL SECURITY;
CREATE POLICY scheduling_dispatch__demand_tenant_isolation ON scheduling_dispatch__demand
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- source_capability_key: immutable after create; enforced by trigger, not by application code
-- source_ref: immutable after create; enforced by trigger, not by application code
