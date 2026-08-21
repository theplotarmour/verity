-- Generated from _model/capabilities/scheduling_dispatch.yaml · entity schedule_version
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE scheduling_dispatch__schedule_version (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  scope_location_ref uuid,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  version_number integer NOT NULL,
  published_at timestamptz,
  published_by_principal_id uuid,
  assignment_ids jsonb NOT NULL,
  change_summary jsonb,
  coverage_shortfall_count integer NOT NULL
);

ALTER TABLE scheduling_dispatch__schedule_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_dispatch__schedule_version FORCE ROW LEVEL SECURITY;
CREATE POLICY scheduling_dispatch__schedule_version_tenant_isolation ON scheduling_dispatch__schedule_version
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
