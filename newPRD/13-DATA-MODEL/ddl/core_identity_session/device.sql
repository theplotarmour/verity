-- Generated from _model/capabilities/core_identity_session.yaml · entity device
-- Tenancy mode: tenant_scoped

CREATE TABLE core_identity_session__device (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  label text NOT NULL,
  kind text NOT NULL,
  shared boolean NOT NULL,
  trust_status text NOT NULL,
  bound_site_id uuid,
  last_seen_at timestamptz,
  os_family text,
  app_version text,
  min_supported_version_ok boolean
);

ALTER TABLE core_identity_session__device ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_identity_session__device FORCE ROW LEVEL SECURITY;
CREATE POLICY core_identity_session__device_tenant_isolation ON core_identity_session__device
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
