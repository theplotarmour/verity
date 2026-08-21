-- Generated from _model/capabilities/catalog.yaml · entity availability_schedule
-- Tenancy mode: tenant_scoped

CREATE TABLE catalog__availability_schedule (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  label text NOT NULL,
  weekly_windows jsonb,
  date_from date,
  date_to date,
  location_refs jsonb,
  channel_refs jsonb,
  timezone text NOT NULL
);

ALTER TABLE catalog__availability_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog__availability_schedule FORCE ROW LEVEL SECURITY;
CREATE POLICY catalog__availability_schedule_tenant_isolation ON catalog__availability_schedule
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
