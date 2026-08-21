-- Generated from _model/capabilities/attendance_verification.yaml · entity attendance_dispute
-- Tenancy mode: tenant_scoped

CREATE TABLE attendance_verification__attendance_dispute (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  attendance_record_id uuid NOT NULL,
  raised_by text NOT NULL,
  raised_by_principal_id uuid,
  disputed_field text NOT NULL,
  claimed_position text NOT NULL,
  counter_position text,
  supporting_evidence_refs jsonb,
  outcome text NOT NULL,
  outcome_reason text,
  resolved_by_principal_id uuid,
  resolved_at timestamptz,
  financial_effect_minor bigint
);

ALTER TABLE attendance_verification__attendance_dispute ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_verification__attendance_dispute FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_verification__attendance_dispute_tenant_isolation ON attendance_verification__attendance_dispute
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
