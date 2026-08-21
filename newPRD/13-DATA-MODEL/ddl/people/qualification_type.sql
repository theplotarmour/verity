-- Generated from _model/capabilities/people.yaml · entity qualification_type
-- Tenancy mode: tenant_scoped

CREATE TABLE people__qualification_type (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  never_expires boolean NOT NULL,
  default_validity_months integer,
  mandatory_for_engagement boolean NOT NULL,
  evidence_required boolean NOT NULL,
  self_declarable boolean NOT NULL,
  renewal_lead_days integer NOT NULL,
  source_pack_key text
);

ALTER TABLE people__qualification_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE people__qualification_type FORCE ROW LEVEL SECURITY;
CREATE POLICY people__qualification_type_tenant_isolation ON people__qualification_type
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
