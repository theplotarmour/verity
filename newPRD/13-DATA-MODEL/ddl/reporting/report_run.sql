-- Generated from _model/capabilities/reporting.yaml · entity report_run
-- Tenancy mode: tenant_scoped

CREATE TABLE reporting__report_run (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  report_id uuid NOT NULL,
  run_for_principal_id uuid NOT NULL,
  scope_fingerprint text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metric_versions jsonb NOT NULL,
  figures jsonb NOT NULL,
  rows_returned integer NOT NULL,
  rows_suppressed_by_permission integer NOT NULL,
  rows_suppressed_by_small_population integer NOT NULL,
  data_as_of timestamptz NOT NULL,
  executed_at timestamptz NOT NULL,
  duration_ms integer NOT NULL,
  trigger text NOT NULL,
  exported boolean NOT NULL
);

ALTER TABLE reporting__report_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting__report_run FORCE ROW LEVEL SECURITY;
CREATE POLICY reporting__report_run_tenant_isolation ON reporting__report_run
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- executed_at: immutable after create; enforced by trigger, not by application code
