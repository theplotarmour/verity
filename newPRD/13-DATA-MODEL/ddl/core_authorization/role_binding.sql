-- Generated from _model/capabilities/core_authorization.yaml · entity role_binding
-- Tenancy mode: tenant_scoped

CREATE TABLE core_authorization__role_binding (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  principal_id uuid NOT NULL,
  role_id uuid NOT NULL,
  scope_bindings jsonb NOT NULL,
  granted_by_principal_id uuid NOT NULL,
  granted_at timestamptz NOT NULL,
  expires_at timestamptz,
  reason text,
  revoked_at timestamptz,
  revoked_by_principal_id uuid
);

ALTER TABLE core_authorization__role_binding ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_authorization__role_binding FORCE ROW LEVEL SECURITY;
CREATE POLICY core_authorization__role_binding_tenant_isolation ON core_authorization__role_binding
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- granted_at: immutable after create; enforced by trigger, not by application code
