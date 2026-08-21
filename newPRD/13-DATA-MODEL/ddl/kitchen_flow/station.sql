-- Generated from _model/capabilities/kitchen_flow.yaml · entity station
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE kitchen_flow__station (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  location_ref uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  routing_tags jsonb NOT NULL,
  concurrent_capacity integer NOT NULL,
  sequence_position integer NOT NULL,
  default_step_seconds integer,
  display_device_refs jsonb,
  expedite_visible boolean NOT NULL,
  accepts_when_offline boolean NOT NULL
);

ALTER TABLE kitchen_flow__station ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_flow__station FORCE ROW LEVEL SECURITY;
CREATE POLICY kitchen_flow__station_tenant_isolation ON kitchen_flow__station
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
