-- Generated from _model/capabilities/core_configuration.yaml · entity config_value
-- Tenancy mode: tenant_scoped

CREATE TABLE core_configuration__config_value (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  config_key text NOT NULL,
  scope_kind text NOT NULL,
  scope_ref uuid,
  value text,
  set_by_principal_id uuid NOT NULL,
  set_at timestamptz NOT NULL,
  reason text,
  source_pack_key text,
  authored_against_capability_version text,
  effective_from timestamptz,
  superseded_at timestamptz,
  superseded_by_value_id uuid
);

ALTER TABLE core_configuration__config_value ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_configuration__config_value FORCE ROW LEVEL SECURITY;
CREATE POLICY core_configuration__config_value_tenant_isolation ON core_configuration__config_value
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- config_key: immutable after create; enforced by trigger, not by application code
-- scope_kind: immutable after create; enforced by trigger, not by application code
-- scope_ref: immutable after create; enforced by trigger, not by application code
