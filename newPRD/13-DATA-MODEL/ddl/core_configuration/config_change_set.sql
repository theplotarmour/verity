-- Generated from _model/capabilities/core_configuration.yaml · entity config_change_set
-- Tenancy mode: tenant_scoped

CREATE TABLE core_configuration__config_change_set (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  label text NOT NULL,
  changes jsonb NOT NULL,
  highest_change_impact text NOT NULL,
  created_by_principal_id uuid NOT NULL,
  created_at timestamptz NOT NULL,
  staging_run_ref text,
  approved_by_principal_id uuid,
  applied_at timestamptz,
  rollback_of_change_set_id uuid
);

ALTER TABLE core_configuration__config_change_set ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_configuration__config_change_set FORCE ROW LEVEL SECURITY;
CREATE POLICY core_configuration__config_change_set_tenant_isolation ON core_configuration__config_change_set
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- created_at: immutable after create; enforced by trigger, not by application code
