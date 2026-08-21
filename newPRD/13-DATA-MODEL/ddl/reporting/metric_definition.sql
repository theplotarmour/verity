-- Generated from _model/capabilities/reporting.yaml · entity metric_definition
-- Tenancy mode: tenant_scoped

CREATE TABLE reporting__metric_definition (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  decision_question text NOT NULL,
  source_capability_key text NOT NULL,
  source_entity_or_event text NOT NULL,
  aggregation text NOT NULL,
  percentile numeric(18,4),
  measure_field text,
  filter_expression text,
  exclusions jsonb,
  time_basis text NOT NULL,
  grain text NOT NULL,
  denominator_definition text,
  target_value numeric(18,4),
  direction_of_good text NOT NULL,
  owner_principal_id uuid NOT NULL,
  version_number integer NOT NULL,
  agreed_at timestamptz,
  sensitive boolean NOT NULL,
  financial boolean NOT NULL
);

ALTER TABLE reporting__metric_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting__metric_definition FORCE ROW LEVEL SECURITY;
CREATE POLICY reporting__metric_definition_tenant_isolation ON reporting__metric_definition
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
