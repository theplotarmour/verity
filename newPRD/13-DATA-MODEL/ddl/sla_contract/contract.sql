-- Generated from _model/capabilities/sla_contract.yaml · entity contract
-- Tenancy mode: tenant_scoped

CREATE TABLE sla_contract__contract (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  counterparty_ref uuid NOT NULL,
  title text NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  auto_renew boolean NOT NULL,
  renewal_notice_days integer,
  scope_location_refs jsonb,
  scope_expression text,
  billing_basis text NOT NULL,
  currency text NOT NULL,
  value_minor bigint,
  penalty_cap_minor bigint,
  operating_calendar_ref uuid,
  document_ref text,
  owner_principal_id uuid,
  version_number integer NOT NULL,
  supersedes_contract_id uuid
);

ALTER TABLE sla_contract__contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_contract__contract FORCE ROW LEVEL SECURITY;
CREATE POLICY sla_contract__contract_tenant_isolation ON sla_contract__contract
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
