-- Generated from _model/capabilities/people.yaml · entity absence
-- Tenancy mode: tenant_scoped

CREATE TABLE people__absence (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  member_id uuid NOT NULL,
  absence_kind text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_part_period boolean NOT NULL,
  reason_text text,
  evidence_ref text,
  notified_at timestamptz,
  approved_by_principal_id uuid,
  affects_availability boolean NOT NULL
);

ALTER TABLE people__absence ENABLE ROW LEVEL SECURITY;
ALTER TABLE people__absence FORCE ROW LEVEL SECURITY;
CREATE POLICY people__absence_tenant_isolation ON people__absence
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
