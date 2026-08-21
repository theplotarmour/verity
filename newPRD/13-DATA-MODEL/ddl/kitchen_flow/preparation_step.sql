-- Generated from _model/capabilities/kitchen_flow.yaml · entity preparation_step
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE kitchen_flow__preparation_step (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  station_id uuid NOT NULL,
  line_refs jsonb NOT NULL,
  display_summary text NOT NULL,
  quantity_summary text NOT NULL,
  step_notes text,
  expected_seconds integer,
  started_at timestamptz,
  completed_at timestamptz,
  elapsed_seconds integer,
  started_by_principal_id uuid,
  completed_by_principal_id uuid,
  bumped_forward_from_step_id uuid,
  sequence_position integer NOT NULL,
  hold_reason text,
  device_ref uuid
);

ALTER TABLE kitchen_flow__preparation_step ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_flow__preparation_step FORCE ROW LEVEL SECURITY;
CREATE POLICY kitchen_flow__preparation_step_tenant_isolation ON kitchen_flow__preparation_step
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
