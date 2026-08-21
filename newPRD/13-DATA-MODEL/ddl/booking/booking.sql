-- Generated from _model/capabilities/booking.yaml · entity booking
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE booking__booking (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  booked_by_party_ref uuid,
  subject_party_ref uuid,
  contact_channel_ref uuid,
  location_ref uuid,
  offering_ref uuid,
  requested_resource_ref uuid,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  party_size integer NOT NULL,
  channel text NOT NULL,
  deposit_required_minor bigint,
  deposit_paid_minor bigint,
  deposit_reference text,
  cancellation_policy_id uuid,
  cancellation_deadline_at timestamptz,
  notes text,
  access_requirements text,
  source_waitlist_id uuid,
  rescheduled_from_booking_id uuid,
  reschedule_count integer NOT NULL,
  no_show_recorded_at timestamptz,
  arrived_at timestamptz
);

ALTER TABLE booking__booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking__booking FORCE ROW LEVEL SECURITY;
CREATE POLICY booking__booking_tenant_isolation ON booking__booking
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
