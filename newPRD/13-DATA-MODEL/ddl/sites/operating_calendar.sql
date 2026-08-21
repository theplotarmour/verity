-- Generated from _model/capabilities/sites.yaml · entity operating_calendar
-- Tenancy mode: tenant_scoped

CREATE TABLE sites__operating_calendar (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  weekly_pattern jsonb NOT NULL,
  continuous_operation boolean NOT NULL,
  day_boundary_time time NOT NULL,
  timezone text NOT NULL,
  inherits_from_calendar_id uuid
);

ALTER TABLE sites__operating_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites__operating_calendar FORCE ROW LEVEL SECURITY;
CREATE POLICY sites__operating_calendar_tenant_isolation ON sites__operating_calendar
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
