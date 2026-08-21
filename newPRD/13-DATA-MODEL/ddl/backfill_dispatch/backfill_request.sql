-- Generated from _model/capabilities/backfill_dispatch.yaml · entity backfill_request
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE backfill_dispatch__backfill_request (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  commitment_ref uuid NOT NULL,
  location_ref uuid,
  absent_resource_ref uuid,
  cause text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  required_qualification_keys jsonb NOT NULL,
  required_count integer NOT NULL,
  priority text NOT NULL,
  lead_minutes_at_raise integer NOT NULL,
  escalation_tier integer NOT NULL,
  escalation_policy_id uuid NOT NULL,
  filled_by_resource_ref uuid,
  filled_at timestamptz,
  time_to_fill_seconds integer,
  offers_made integer NOT NULL,
  declines_received integer NOT NULL,
  billing_classification text NOT NULL,
  premium_applied boolean NOT NULL,
  outcome_reason text
);

ALTER TABLE backfill_dispatch__backfill_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE backfill_dispatch__backfill_request FORCE ROW LEVEL SECURITY;
CREATE POLICY backfill_dispatch__backfill_request_tenant_isolation ON backfill_dispatch__backfill_request
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
