-- Generated from _model/capabilities/party.yaml · entity party_channel
-- Tenancy mode: tenant_scoped

CREATE TABLE party__party_channel (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  party_id uuid NOT NULL,
  channel_kind text NOT NULL,
  value text NOT NULL,
  label text,
  is_primary boolean NOT NULL,
  verified_at timestamptz,
  verification_method text NOT NULL,
  consent_marketing text NOT NULL,
  consent_transactional text NOT NULL,
  consent_recorded_at timestamptz,
  consent_evidence_ref text,
  bounce_count integer NOT NULL,
  last_successful_delivery_at timestamptz,
  suppressed_at timestamptz
);

ALTER TABLE party__party_channel ENABLE ROW LEVEL SECURITY;
ALTER TABLE party__party_channel FORCE ROW LEVEL SECURITY;
CREATE POLICY party__party_channel_tenant_isolation ON party__party_channel
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
