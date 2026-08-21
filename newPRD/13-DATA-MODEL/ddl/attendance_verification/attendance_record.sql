-- Generated from _model/capabilities/attendance_verification.yaml · entity attendance_record
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE attendance_verification__attendance_record (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  resource_ref uuid NOT NULL,
  commitment_ref uuid,
  location_ref uuid,
  operating_day date NOT NULL,
  claimed_start_at timestamptz,
  claimed_end_at timestamptz,
  verified_start_at timestamptz,
  verified_end_at timestamptz,
  agreed_start_at timestamptz,
  agreed_end_at timestamptz,
  start_evidence_strength text NOT NULL,
  end_evidence_strength text NOT NULL,
  start_evidence_ref text,
  end_evidence_ref text,
  start_position_verdict text NOT NULL,
  end_position_verdict text NOT NULL,
  start_margin_m integer,
  end_margin_m integer,
  break_minutes integer NOT NULL,
  payable_minutes integer,
  billable_minutes integer,
  substitution_of_resource_ref uuid,
  recorded_by_principal_id uuid NOT NULL,
  source text NOT NULL,
  device_ref uuid,
  sync_lag_minutes integer,
  dispute_id uuid,
  locked_at timestamptz
);

ALTER TABLE attendance_verification__attendance_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_verification__attendance_record FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_verification__attendance_record_tenant_isolation ON attendance_verification__attendance_record
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
