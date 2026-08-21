-- Generated from _model/capabilities/notification.yaml · entity notification_batch
-- Tenancy mode: tenant_scoped

CREATE TABLE notification__notification_batch (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  recipient_principal_id uuid,
  recipient_party_ref uuid,
  category_key text NOT NULL,
  channel text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  message_count integer NOT NULL,
  dispatched_message_id uuid,
  max_priority_in_batch text NOT NULL
);

ALTER TABLE notification__notification_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification__notification_batch FORCE ROW LEVEL SECURITY;
CREATE POLICY notification__notification_batch_tenant_isolation ON notification__notification_batch
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
