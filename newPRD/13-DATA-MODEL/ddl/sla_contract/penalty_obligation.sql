-- Generated from _model/capabilities/sla_contract.yaml · entity penalty_obligation
-- Tenancy mode: tenant_scoped

CREATE TABLE sla_contract__penalty_obligation (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  service_level_id uuid NOT NULL,
  measurement_period_start date NOT NULL,
  measurement_period_end date NOT NULL,
  breach_count integer NOT NULL,
  measured_value numeric(18,4) NOT NULL,
  target_value numeric(18,4) NOT NULL,
  calculated_amount_minor bigint NOT NULL,
  capped_amount_minor bigint NOT NULL,
  obligation_kind text NOT NULL,
  measurement_ids jsonb NOT NULL,
  approved_by_principal_id uuid,
  applied_reference text,
  waived_reason text
);

ALTER TABLE sla_contract__penalty_obligation ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_contract__penalty_obligation FORCE ROW LEVEL SECURITY;
CREATE POLICY sla_contract__penalty_obligation_tenant_isolation ON sla_contract__penalty_obligation
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
