-- Generated from _model/capabilities/core_identity_session.yaml · entity principal
-- Tenancy mode: cross_tenant_row_with_membership

CREATE TABLE core_identity_session__principal (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL  -- injected: required by kernel tenancy rule,
  kind text NOT NULL,
  primary_email citext,
  primary_phone_e164 text,
  display_name text NOT NULL,
  status text NOT NULL,
  mfa_enrolled boolean NOT NULL,
  password_credential_id uuid,
  failed_auth_count integer,
  locked_until timestamptz,
  last_authenticated_at timestamptz,
  created_at timestamptz NOT NULL,
  deactivated_at timestamptz
);

ALTER TABLE core_identity_session__principal ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_identity_session__principal FORCE ROW LEVEL SECURITY;
CREATE POLICY core_identity_session__principal_tenant_isolation ON core_identity_session__principal
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- kind: immutable after create; enforced by trigger, not by application code
-- created_at: immutable after create; enforced by trigger, not by application code
