-- Generated from _model/capabilities/integrations.yaml · entity connection
-- Tenancy mode: tenant_scoped

CREATE TABLE integrations__connection (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  connector_key text NOT NULL,
  label text NOT NULL,
  direction text NOT NULL,
  credential_ref text,
  credential_expires_at timestamptz,
  endpoint_url text,
  auth_kind text NOT NULL,
  owner_principal_id uuid NOT NULL,
  environment text NOT NULL,
  rate_limit_per_minute integer,
  concurrency_limit integer NOT NULL,
  retry_budget_hours integer NOT NULL,
  mapping_version text,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer NOT NULL,
  acting_principal_id uuid
);

ALTER TABLE integrations__connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations__connection FORCE ROW LEVEL SECURITY;
CREATE POLICY integrations__connection_tenant_isolation ON integrations__connection
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- connector_key: immutable after create; enforced by trigger, not by application code
