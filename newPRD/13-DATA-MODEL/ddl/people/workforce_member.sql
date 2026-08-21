-- Generated from _model/capabilities/people.yaml · entity workforce_member
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE people__workforce_member (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  party_ref uuid NOT NULL,
  member_code text NOT NULL,
  engagement_kind text NOT NULL,
  supplying_party_ref uuid,
  primary_location_ref uuid,
  engaged_from date NOT NULL,
  engaged_to date,
  notice_period_days integer,
  cost_rate_minor bigint,
  cost_rate_basis text,
  max_hours_per_day numeric(18,4),
  max_hours_per_week numeric(18,4),
  min_rest_hours_between_assignments numeric(18,4),
  max_consecutive_days integer,
  availability_pattern jsonb,
  emergency_contact_ref uuid,
  bank_reference_ref text,
  exit_reason text,
  rehire_eligible text NOT NULL
);

ALTER TABLE people__workforce_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE people__workforce_member FORCE ROW LEVEL SECURITY;
CREATE POLICY people__workforce_member_tenant_isolation ON people__workforce_member
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
