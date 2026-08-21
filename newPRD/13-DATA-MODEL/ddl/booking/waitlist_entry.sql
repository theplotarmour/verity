-- Generated from _model/capabilities/booking.yaml · entity waitlist_entry
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE booking__waitlist_entry (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  party_ref uuid,
  contact_channel_ref uuid NOT NULL,
  location_ref uuid,
  offering_ref uuid,
  earliest_acceptable_at timestamptz NOT NULL,
  latest_acceptable_at timestamptz NOT NULL,
  acceptable_weekdays jsonb,
  party_size integer NOT NULL,
  priority_rank integer NOT NULL,
  offered_booking_id uuid,
  offer_expires_at timestamptz,
  offers_declined integer NOT NULL,
  expires_at timestamptz NOT NULL
);

ALTER TABLE booking__waitlist_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking__waitlist_entry FORCE ROW LEVEL SECURITY;
CREATE POLICY booking__waitlist_entry_tenant_isolation ON booking__waitlist_entry
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
