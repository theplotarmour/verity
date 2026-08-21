-- Generated from _model/capabilities/people.yaml · entity qualification
-- Tenancy mode: tenant_scoped

CREATE TABLE people__qualification (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  member_id uuid NOT NULL,
  qualification_type_id uuid NOT NULL,
  reference text,
  issued_on date,
  valid_from date NOT NULL,
  valid_to date,
  evidence_ref text,
  verified_by_principal_id uuid,
  verified_at timestamptz,
  verification_method text NOT NULL
);

ALTER TABLE people__qualification ENABLE ROW LEVEL SECURITY;
ALTER TABLE people__qualification FORCE ROW LEVEL SECURITY;
CREATE POLICY people__qualification_tenant_isolation ON people__qualification
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
