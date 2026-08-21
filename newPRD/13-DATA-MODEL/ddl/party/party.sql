-- Generated from _model/capabilities/party.yaml · entity party
-- Tenancy mode: tenant_scoped

CREATE TABLE party__party (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  kind text NOT NULL,
  display_name text NOT NULL,
  legal_name text,
  primary_phone_e164 text,
  primary_email citext,
  tax_registration_id text,
  tax_registration_kind text NOT NULL,
  identity_document_kind text,
  identity_document_ref text,
  identity_verified_at timestamptz,
  credit_limit_minor bigint,
  payment_terms_days integer,
  risk_flag text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL,
  created_by_principal_id uuid NOT NULL,
  merged_into_party_id uuid,
  search_projection_hash text
);

ALTER TABLE party__party ENABLE ROW LEVEL SECURITY;
ALTER TABLE party__party FORCE ROW LEVEL SECURITY;
CREATE POLICY party__party_tenant_isolation ON party__party
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- kind: immutable after create; enforced by trigger, not by application code
-- created_at: immutable after create; enforced by trigger, not by application code
