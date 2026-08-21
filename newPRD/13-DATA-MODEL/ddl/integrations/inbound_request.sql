-- Generated from _model/capabilities/integrations.yaml · entity inbound_request
-- Tenancy mode: tenant_scoped

CREATE TABLE integrations__inbound_request (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  connection_id uuid,
  received_at timestamptz NOT NULL,
  source_ip inet,
  external_event_id text,
  idempotency_key text,
  signature_verified boolean NOT NULL,
  payload_excerpt text,
  payload_hash text NOT NULL,
  mapped_action text,
  outcome text NOT NULL,
  outcome_detail text,
  response_status integer NOT NULL,
  replayed_response boolean NOT NULL,
  processing_ms integer NOT NULL
);

ALTER TABLE integrations__inbound_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations__inbound_request FORCE ROW LEVEL SECURITY;
CREATE POLICY integrations__inbound_request_tenant_isolation ON integrations__inbound_request
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- received_at: immutable after create; enforced by trigger, not by application code
