-- Generated from _model/capabilities/reporting.yaml · entity report
-- Tenancy mode: tenant_scoped

CREATE TABLE reporting__report (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  decision_question text NOT NULL,
  metric_keys jsonb NOT NULL,
  dimension_keys jsonb,
  default_period text NOT NULL,
  audience_role_keys jsonb NOT NULL,
  drill_target text,
  schedule_cron text,
  schedule_channel text NOT NULL,
  freshness_target_minutes integer NOT NULL,
  row_limit integer NOT NULL,
  owner_principal_id uuid NOT NULL,
  source_pack_key text
);

ALTER TABLE reporting__report ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting__report FORCE ROW LEVEL SECURITY;
CREATE POLICY reporting__report_tenant_isolation ON reporting__report
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
