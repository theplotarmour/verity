-- Generated from _model/capabilities/backfill_dispatch.yaml · entity escalation_policy
-- Tenancy mode: tenant_scoped

CREATE TABLE backfill_dispatch__escalation_policy (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  applies_to_priority jsonb NOT NULL,
  tiers jsonb NOT NULL,
  min_lead_minutes_for_full_ladder integer NOT NULL,
  allow_premium boolean NOT NULL,
  max_premium_percent integer,
  source_pack_key text
);

ALTER TABLE backfill_dispatch__escalation_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE backfill_dispatch__escalation_policy FORCE ROW LEVEL SECURITY;
CREATE POLICY backfill_dispatch__escalation_policy_tenant_isolation ON backfill_dispatch__escalation_policy
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
