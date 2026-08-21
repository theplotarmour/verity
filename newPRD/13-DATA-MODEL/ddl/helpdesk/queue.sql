-- Generated from _model/capabilities/helpdesk.yaml · entity queue
-- Tenancy mode: tenant_scoped

CREATE TABLE helpdesk__queue (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  is_default boolean NOT NULL,
  watcher_role_keys jsonb NOT NULL,
  accepts_categories jsonb,
  accepts_locations jsonb,
  business_hours_calendar_ref uuid,
  fallback_queue_id uuid,
  auto_assign_strategy text NOT NULL
);

ALTER TABLE helpdesk__queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk__queue FORCE ROW LEVEL SECURITY;
CREATE POLICY helpdesk__queue_tenant_isolation ON helpdesk__queue
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
