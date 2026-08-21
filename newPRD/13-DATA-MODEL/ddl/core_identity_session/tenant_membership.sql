-- Generated from _model/capabilities/core_identity_session.yaml · entity tenant_membership
-- Tenancy mode: tenant_scoped

CREATE TABLE core_identity_session__tenant_membership (
  id uuid NOT NULL,
  principal_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  status text NOT NULL,
  employment_link_id uuid,
  default_landing_surface text NOT NULL,
  invited_by_principal_id uuid,
  joined_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE core_identity_session__tenant_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_identity_session__tenant_membership FORCE ROW LEVEL SECURITY;
CREATE POLICY core_identity_session__tenant_membership_tenant_isolation ON core_identity_session__tenant_membership
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
