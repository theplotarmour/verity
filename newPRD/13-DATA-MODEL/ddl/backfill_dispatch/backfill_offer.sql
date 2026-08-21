-- Generated from _model/capabilities/backfill_dispatch.yaml · entity backfill_offer
-- Tenancy mode: tenant_scoped

CREATE TABLE backfill_dispatch__backfill_offer (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  request_id uuid NOT NULL,
  candidate_resource_ref uuid NOT NULL,
  tier integer NOT NULL,
  rank integer NOT NULL,
  rank_factors jsonb NOT NULL,
  premium_percent integer NOT NULL,
  sent_at timestamptz NOT NULL,
  channel text NOT NULL,
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  response text NOT NULL,
  decline_reason text,
  delivery_confirmed_at timestamptz
);

ALTER TABLE backfill_dispatch__backfill_offer ENABLE ROW LEVEL SECURITY;
ALTER TABLE backfill_dispatch__backfill_offer FORCE ROW LEVEL SECURITY;
CREATE POLICY backfill_dispatch__backfill_offer_tenant_isolation ON backfill_dispatch__backfill_offer
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
