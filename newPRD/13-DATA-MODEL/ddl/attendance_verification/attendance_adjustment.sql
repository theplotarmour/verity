-- Generated from _model/capabilities/attendance_verification.yaml · entity attendance_adjustment
-- Tenancy mode: tenant_scoped

CREATE TABLE attendance_verification__attendance_adjustment (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  attendance_record_id uuid NOT NULL,
  adjustment_kind text NOT NULL,
  field_adjusted text NOT NULL,
  previous_value text NOT NULL,
  new_value text NOT NULL,
  affects_pay boolean NOT NULL,
  affects_billing boolean NOT NULL,
  reason text NOT NULL,
  made_by_principal_id uuid NOT NULL,
  made_at timestamptz NOT NULL,
  approved_by_principal_id uuid,
  person_notified_at timestamptz
);

ALTER TABLE attendance_verification__attendance_adjustment ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_verification__attendance_adjustment FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_verification__attendance_adjustment_tenant_isolation ON attendance_verification__attendance_adjustment
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- made_at: immutable after create; enforced by trigger, not by application code
