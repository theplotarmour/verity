-- Generated from _model/capabilities/sla_contract.yaml · entity sla_measurement
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE sla_contract__sla_measurement (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  service_level_id uuid NOT NULL,
  service_level_version integer NOT NULL,
  subject_ref uuid NOT NULL,
  subject_capability_key text NOT NULL,
  location_ref uuid,
  calendar_ref_used uuid,
  started_at timestamptz NOT NULL,
  target_at timestamptz,
  stopped_at timestamptz,
  total_paused_minutes integer NOT NULL,
  elapsed_measured numeric(18,4),
  outcome text NOT NULL,
  breach_at timestamptz,
  breach_margin numeric(18,4),
  excluded boolean NOT NULL,
  exclusion_reason text,
  excluded_by_principal_id uuid
);

ALTER TABLE sla_contract__sla_measurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_contract__sla_measurement FORCE ROW LEVEL SECURITY;
CREATE POLICY sla_contract__sla_measurement_tenant_isolation ON sla_contract__sla_measurement
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
