-- Generated from _model/capabilities/offline_sync.yaml · entity sync_conflict
-- Tenancy mode: tenant_scoped

CREATE TABLE offline_sync__sync_conflict (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  mutation_id uuid NOT NULL,
  capability_key text NOT NULL,
  subject_ref uuid NOT NULL,
  conflicting_fields jsonb NOT NULL,
  device_values jsonb NOT NULL,
  server_values jsonb NOT NULL,
  device_principal_id uuid NOT NULL,
  server_principal_id uuid,
  device_occurred_at timestamptz NOT NULL,
  server_changed_at timestamptz NOT NULL,
  auto_resolvable boolean NOT NULL,
  resolution text NOT NULL,
  resolved_by_principal_id uuid,
  resolution_reason text,
  resolved_at timestamptz
);

ALTER TABLE offline_sync__sync_conflict ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync__sync_conflict FORCE ROW LEVEL SECURITY;
CREATE POLICY offline_sync__sync_conflict_tenant_isolation ON offline_sync__sync_conflict
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- device_values: immutable after create; enforced by trigger, not by application code
-- server_values: immutable after create; enforced by trigger, not by application code
