-- Generated from _model/capabilities/booking.yaml · entity cancellation_policy
-- Tenancy mode: tenant_scoped

CREATE TABLE booking__cancellation_policy (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  free_cancellation_hours integer NOT NULL,
  late_cancellation_charge_percent integer NOT NULL,
  no_show_charge_percent integer NOT NULL,
  deposit_percent integer NOT NULL,
  deposit_refundable_before_hours integer,
  free_reschedules integer NOT NULL,
  reschedule_charge_percent integer NOT NULL,
  applies_to_channels jsonb,
  disclosure_text text NOT NULL
);

ALTER TABLE booking__cancellation_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking__cancellation_policy FORCE ROW LEVEL SECURITY;
CREATE POLICY booking__cancellation_policy_tenant_isolation ON booking__cancellation_policy
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
