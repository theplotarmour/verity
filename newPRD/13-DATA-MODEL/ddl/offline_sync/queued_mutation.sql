-- Generated from _model/capabilities/offline_sync.yaml · entity queued_mutation
-- Tenancy mode: tenant_scoped

CREATE TABLE offline_sync__queued_mutation (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  device_store_id uuid NOT NULL,
  sequence_in_device bigint NOT NULL,
  capability_key text NOT NULL,
  action_key text NOT NULL,
  subject_ref uuid,
  payload jsonb NOT NULL,
  base_version text,
  occurred_at timestamptz NOT NULL,
  queued_at timestamptz NOT NULL,
  received_at timestamptz,
  applied_at timestamptz,
  acting_principal_id uuid NOT NULL,
  clock_skew_seconds integer,
  attached_evidence_ids jsonb,
  atomic_group_id uuid,
  idempotency_key text NOT NULL,
  attempt_count integer NOT NULL,
  conflict_id uuid,
  outcome_code text
);

ALTER TABLE offline_sync__queued_mutation ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync__queued_mutation FORCE ROW LEVEL SECURITY;
CREATE POLICY offline_sync__queued_mutation_tenant_isolation ON offline_sync__queued_mutation
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- sequence_in_device: immutable after create; enforced by trigger, not by application code
-- capability_key: immutable after create; enforced by trigger, not by application code
-- action_key: immutable after create; enforced by trigger, not by application code
-- subject_ref: immutable after create; enforced by trigger, not by application code
-- payload: immutable after create; enforced by trigger, not by application code
-- base_version: immutable after create; enforced by trigger, not by application code
-- occurred_at: immutable after create; enforced by trigger, not by application code
-- queued_at: immutable after create; enforced by trigger, not by application code
-- acting_principal_id: immutable after create; enforced by trigger, not by application code
-- idempotency_key: immutable after create; enforced by trigger, not by application code
