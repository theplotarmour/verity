-- Generated from _model/capabilities/lease_management.yaml · entity escalation_rule
-- Tenancy mode: tenant_scoped

CREATE TABLE lease_management__escalation_rule (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  lease_id uuid NOT NULL,
  applies_to_charge_kind text NOT NULL,
  method text NOT NULL,
  percentage numeric(18,4),
  amount_minor bigint,
  index_key text,
  index_lag_months integer,
  floor_percentage numeric(18,4),
  cap_percentage numeric(18,4),
  steps jsonb,
  effective_dates jsonb NOT NULL,
  last_applied_on date,
  next_due_on date,
  requires_agreement boolean NOT NULL
);

ALTER TABLE lease_management__escalation_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_management__escalation_rule FORCE ROW LEVEL SECURITY;
CREATE POLICY lease_management__escalation_rule_tenant_isolation ON lease_management__escalation_rule
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
