-- Generated from _model/capabilities/sla_contract.yaml · entity service_level
-- Tenancy mode: tenant_scoped

CREATE TABLE sla_contract__service_level (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  contract_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  measure_kind text NOT NULL,
  start_event_key text NOT NULL,
  stop_event_key text,
  target_value numeric(18,4) NOT NULL,
  target_unit text NOT NULL,
  calendar_ref uuid,
  applies_when_expression text,
  pausable_reason_keys jsonb NOT NULL,
  max_pause_minutes integer,
  measurement_period text NOT NULL,
  aggregation text NOT NULL,
  percentile numeric(18,4),
  grace_value numeric(18,4),
  version_number integer NOT NULL
);

ALTER TABLE sla_contract__service_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_contract__service_level FORCE ROW LEVEL SECURITY;
CREATE POLICY sla_contract__service_level_tenant_isolation ON sla_contract__service_level
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
