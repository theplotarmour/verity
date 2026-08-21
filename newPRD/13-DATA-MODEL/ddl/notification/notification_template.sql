-- Generated from _model/capabilities/notification.yaml · entity notification_template
-- Tenancy mode: tenant_scoped

CREATE TABLE notification__notification_template (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  version_number integer NOT NULL,
  channel text NOT NULL,
  locale text NOT NULL,
  subject_text text,
  body_text text NOT NULL,
  variables jsonb NOT NULL,
  cost_class text NOT NULL,
  external_registration_id text,
  external_entity_id text,
  external_header text,
  registration_state text NOT NULL,
  registration_rejection_reason text,
  mandatory_class text NOT NULL,
  quiet_hours_exempt boolean NOT NULL,
  max_length integer
);

ALTER TABLE notification__notification_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification__notification_template FORCE ROW LEVEL SECURITY;
CREATE POLICY notification__notification_template_tenant_isolation ON notification__notification_template
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
-- channel: immutable after create; enforced by trigger, not by application code
