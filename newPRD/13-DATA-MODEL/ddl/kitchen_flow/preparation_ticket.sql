-- Generated from _model/capabilities/kitchen_flow.yaml · entity preparation_ticket
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE kitchen_flow__preparation_ticket (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  location_ref uuid NOT NULL,
  source_ref uuid NOT NULL,
  source_capability_key text NOT NULL,
  display_reference text NOT NULL,
  sequence_number integer NOT NULL,
  received_at timestamptz NOT NULL,
  target_ready_at timestamptz,
  coordination_mode text NOT NULL,
  priority text NOT NULL,
  expedited_by_principal_id uuid,
  expedited_reason text,
  ready_at timestamptz,
  collected_at timestamptz,
  recall_of_ticket_id uuid,
  recall_count integer NOT NULL,
  notes text,
  created_offline boolean NOT NULL,
  sync_lag_seconds integer
);

ALTER TABLE kitchen_flow__preparation_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_flow__preparation_ticket FORCE ROW LEVEL SECURITY;
CREATE POLICY kitchen_flow__preparation_ticket_tenant_isolation ON kitchen_flow__preparation_ticket
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- received_at: immutable after create; enforced by trigger, not by application code
