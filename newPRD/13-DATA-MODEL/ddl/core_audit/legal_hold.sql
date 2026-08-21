-- Generated from _model/capabilities/core_audit.yaml · entity legal_hold
-- Tenancy mode: tenant_scoped

CREATE TABLE core_audit__legal_hold (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  scope_expression text NOT NULL,
  applied_by_principal_id uuid NOT NULL,
  applied_at timestamptz NOT NULL,
  expected_release_at timestamptz,
  released_at timestamptz,
  released_by_principal_id uuid,
  release_reason text,
  affected_record_count bigint
);

ALTER TABLE core_audit__legal_hold ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_audit__legal_hold FORCE ROW LEVEL SECURITY;
CREATE POLICY core_audit__legal_hold_tenant_isolation ON core_audit__legal_hold
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- applied_at: immutable after create; enforced by trigger, not by application code
