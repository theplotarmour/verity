-- Generated from _model/capabilities/scheduling_dispatch.yaml · entity recurrence_pattern
-- Tenancy mode: tenant_scoped

CREATE TABLE scheduling_dispatch__recurrence_pattern (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  source_capability_key text NOT NULL,
  source_ref uuid NOT NULL,
  rule text NOT NULL,
  timezone text NOT NULL,
  starts_on date NOT NULL,
  ends_on date,
  materialised_to date,
  horizon_days integer NOT NULL,
  exception_dates jsonb
);

ALTER TABLE scheduling_dispatch__recurrence_pattern ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_dispatch__recurrence_pattern FORCE ROW LEVEL SECURITY;
CREATE POLICY scheduling_dispatch__recurrence_pattern_tenant_isolation ON scheduling_dispatch__recurrence_pattern
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
