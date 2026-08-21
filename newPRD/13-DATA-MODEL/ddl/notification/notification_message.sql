-- Generated from _model/capabilities/notification.yaml · entity notification_message
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE notification__notification_message (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  template_id uuid NOT NULL,
  template_version integer NOT NULL,
  recipient_principal_id uuid,
  recipient_party_ref uuid,
  recipient_channel_ref uuid,
  audience_rule text NOT NULL,
  source_capability_key text NOT NULL,
  source_ref uuid,
  trigger_event_id uuid,
  rendered_subject text,
  rendered_body text NOT NULL,
  channel text NOT NULL,
  cost_class text NOT NULL,
  estimated_cost_minor bigint,
  priority text NOT NULL,
  mandatory_class text NOT NULL,
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_reference text,
  delivery_state text NOT NULL,
  failure_reason text,
  attempt_count integer NOT NULL,
  batch_id uuid,
  dedupe_key text NOT NULL
);

ALTER TABLE notification__notification_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification__notification_message FORCE ROW LEVEL SECURITY;
CREATE POLICY notification__notification_message_tenant_isolation ON notification__notification_message
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- template_version: immutable after create; enforced by trigger, not by application code
-- rendered_subject: immutable after create; enforced by trigger, not by application code
-- rendered_body: immutable after create; enforced by trigger, not by application code
