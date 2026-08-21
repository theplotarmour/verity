-- Generated from _model/capabilities/core_authorization.yaml · entity permission_grant
-- Tenancy mode: tenant_scoped

CREATE TABLE core_authorization__permission_grant (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  effect text NOT NULL,
  verb text NOT NULL,
  entity_key text NOT NULL,
  capability_key text NOT NULL,
  field_set_mode text NOT NULL,
  field_list jsonb,
  scope text NOT NULL,
  condition_expression text,
  created_at timestamptz NOT NULL,
  created_by_principal_id uuid NOT NULL
);

ALTER TABLE core_authorization__permission_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_authorization__permission_grant FORCE ROW LEVEL SECURITY;
CREATE POLICY core_authorization__permission_grant_tenant_isolation ON core_authorization__permission_grant
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- created_at: immutable after create; enforced by trigger, not by application code
