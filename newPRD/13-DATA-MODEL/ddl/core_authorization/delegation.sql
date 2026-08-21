-- Generated from _model/capabilities/core_authorization.yaml · entity delegation
-- Tenancy mode: tenant_scoped

CREATE TABLE core_authorization__delegation (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  from_principal_id uuid NOT NULL,
  to_principal_id uuid NOT NULL,
  verb_subset jsonb NOT NULL,
  entity_subset jsonb,
  scope_narrowing jsonb,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL,
  revoked_at timestamptz
);

ALTER TABLE core_authorization__delegation ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_authorization__delegation FORCE ROW LEVEL SECURITY;
CREATE POLICY core_authorization__delegation_tenant_isolation ON core_authorization__delegation
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
