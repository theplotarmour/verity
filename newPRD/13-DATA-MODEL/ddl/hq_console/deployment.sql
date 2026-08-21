-- Generated from _model/capabilities/hq_console.yaml · entity deployment
-- Tenancy mode: platform_scoped

CREATE TABLE hq_console__deployment (
  id uuid NOT NULL,
  label text NOT NULL,
  kind text NOT NULL,
  target_selector text NOT NULL,
  target_tenant_count integer NOT NULL,
  from_versions jsonb NOT NULL,
  to_versions jsonb NOT NULL,
  is_breaking boolean NOT NULL,
  broken_override_count integer NOT NULL,
  rehearsal_run_ref text,
  rehearsal_outcome text NOT NULL,
  approved_by_principal_id uuid,
  approval_reason text,
  wave_size integer NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  succeeded_count integer NOT NULL,
  failed_count integer NOT NULL,
  halted_reason text
);

ALTER TABLE hq_console__deployment ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_console__deployment FORCE ROW LEVEL SECURITY;

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
