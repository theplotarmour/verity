-- Generated from _model/capabilities/integrations.yaml · entity outbound_message
-- Tenancy mode: tenant_scoped

CREATE TABLE integrations__outbound_message (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  event_type text NOT NULL,
  event_version integer NOT NULL,
  source_capability_key text NOT NULL,
  source_event_id uuid NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL,
  next_attempt_at timestamptz,
  attempt_count integer NOT NULL,
  last_status_code integer,
  last_response_excerpt text,
  delivered_at timestamptz,
  dead_lettered_at timestamptz,
  dead_letter_reason text,
  replayed_from_message_id uuid
);

ALTER TABLE integrations__outbound_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations__outbound_message FORCE ROW LEVEL SECURITY;
CREATE POLICY integrations__outbound_message_tenant_isolation ON integrations__outbound_message
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- event_type: immutable after create; enforced by trigger, not by application code
-- event_version: immutable after create; enforced by trigger, not by application code
-- source_capability_key: immutable after create; enforced by trigger, not by application code
-- source_event_id: immutable after create; enforced by trigger, not by application code
-- payload: immutable after create; enforced by trigger, not by application code
-- payload_hash: immutable after create; enforced by trigger, not by application code
-- created_at: immutable after create; enforced by trigger, not by application code
