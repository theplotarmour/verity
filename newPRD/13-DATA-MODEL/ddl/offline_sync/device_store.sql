-- Generated from _model/capabilities/offline_sync.yaml · entity device_store
-- Tenancy mode: tenant_scoped

CREATE TABLE offline_sync__device_store (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  device_ref uuid NOT NULL,
  principal_id uuid NOT NULL,
  scope_expression text NOT NULL,
  dataset_version text NOT NULL,
  last_pull_at timestamptz,
  last_push_at timestamptz,
  last_seen_at timestamptz,
  queued_mutation_count integer NOT NULL,
  queued_financial_count integer NOT NULL,
  oldest_queued_at timestamptz,
  storage_used_bytes bigint,
  storage_limit_bytes bigint,
  app_version text,
  min_supported_version_ok boolean NOT NULL,
  wipe_requested_at timestamptz,
  wipe_confirmed_at timestamptz
);

ALTER TABLE offline_sync__device_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync__device_store FORCE ROW LEVEL SECURITY;
CREATE POLICY offline_sync__device_store_tenant_isolation ON offline_sync__device_store
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
