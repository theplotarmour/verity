-- Generated from _model/capabilities/core_authorization.yaml · entity role
-- Tenancy mode: tenant_scoped

CREATE TABLE core_authorization__role (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  archetypes jsonb NOT NULL,
  is_system boolean NOT NULL,
  source_pack_key text,
  source_capability_version text,
  assignable_scopes jsonb NOT NULL,
  requires_mfa boolean NOT NULL,
  requires_elevation_for jsonb,
  created_at timestamptz NOT NULL,
  created_by_principal_id uuid NOT NULL
);

ALTER TABLE core_authorization__role ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_authorization__role FORCE ROW LEVEL SECURITY;
CREATE POLICY core_authorization__role_tenant_isolation ON core_authorization__role
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
-- created_at: immutable after create; enforced by trigger, not by application code
