-- Generated from _model/capabilities/party.yaml · entity party_relationship
-- Tenancy mode: tenant_scoped

CREATE TABLE party__party_relationship (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  party_id uuid NOT NULL,
  relationship_kind text NOT NULL,
  relationship_owner_principal_id uuid,
  started_at date NOT NULL,
  ended_at date,
  end_reason text,
  external_ref text,
  parent_relationship_id uuid
);

ALTER TABLE party__party_relationship ENABLE ROW LEVEL SECURITY;
ALTER TABLE party__party_relationship FORCE ROW LEVEL SECURITY;
CREATE POLICY party__party_relationship_tenant_isolation ON party__party_relationship
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
