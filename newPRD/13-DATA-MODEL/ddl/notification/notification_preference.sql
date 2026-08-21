-- Generated from _model/capabilities/notification.yaml · entity notification_preference
-- Tenancy mode: tenant_scoped

CREATE TABLE notification__notification_preference (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  principal_id uuid,
  party_ref uuid,
  category_key text NOT NULL,
  channel text NOT NULL,
  enabled boolean NOT NULL,
  digest_mode text NOT NULL,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text,
  set_by text NOT NULL,
  set_at timestamptz NOT NULL
);

ALTER TABLE notification__notification_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification__notification_preference FORCE ROW LEVEL SECURITY;
CREATE POLICY notification__notification_preference_tenant_isolation ON notification__notification_preference
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
