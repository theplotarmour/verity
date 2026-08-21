-- Generated from _model/capabilities/lease_management.yaml · entity deposit
-- Tenancy mode: tenant_scoped

CREATE TABLE lease_management__deposit (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  lease_id uuid NOT NULL,
  required_amount_minor bigint NOT NULL,
  held_amount_minor bigint NOT NULL,
  held_since date,
  holding_arrangement text NOT NULL,
  scheme_reference text,
  return_due_by date,
  returned_amount_minor bigint NOT NULL,
  applied_amount_minor bigint NOT NULL,
  application_reason text,
  disputed boolean NOT NULL
);

ALTER TABLE lease_management__deposit ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_management__deposit FORCE ROW LEVEL SECURITY;
CREATE POLICY lease_management__deposit_tenant_isolation ON lease_management__deposit
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
