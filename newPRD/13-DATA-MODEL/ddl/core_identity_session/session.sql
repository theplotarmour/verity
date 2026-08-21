-- Generated from _model/capabilities/core_identity_session.yaml · entity session
-- Tenancy mode: tenant_scoped

CREATE TABLE core_identity_session__session (
  id uuid NOT NULL,
  principal_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  device_id uuid NOT NULL,
  surface text NOT NULL,
  issued_at timestamptz NOT NULL,
  absolute_expiry_at timestamptz NOT NULL,
  idle_expiry_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revocation_reason text,
  elevated_until timestamptz,
  impersonated_by_principal_id uuid,
  impersonation_ticket_ref text,
  ip_at_issue inet,
  user_agent_at_issue text
);

ALTER TABLE core_identity_session__session ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_identity_session__session FORCE ROW LEVEL SECURITY;
CREATE POLICY core_identity_session__session_tenant_isolation ON core_identity_session__session
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- issued_at: immutable after create; enforced by trigger, not by application code
-- absolute_expiry_at: immutable after create; enforced by trigger, not by application code
