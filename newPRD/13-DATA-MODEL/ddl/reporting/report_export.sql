-- Generated from _model/capabilities/reporting.yaml · entity report_export
-- Tenancy mode: tenant_scoped

CREATE TABLE reporting__report_export (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  run_id uuid NOT NULL,
  requested_by_principal_id uuid NOT NULL,
  purpose text NOT NULL,
  format text NOT NULL,
  row_count integer NOT NULL,
  withheld_field_keys jsonb,
  watermark text NOT NULL,
  requested_at timestamptz NOT NULL,
  completed_at timestamptz,
  download_count integer NOT NULL,
  expires_at timestamptz NOT NULL
);

ALTER TABLE reporting__report_export ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting__report_export FORCE ROW LEVEL SECURITY;
CREATE POLICY reporting__report_export_tenant_isolation ON reporting__report_export
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- requested_at: immutable after create; enforced by trigger, not by application code
