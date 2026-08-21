-- Generated from _model/capabilities/core_audit.yaml · entity audit_digest
-- Tenancy mode: tenant_scoped

CREATE TABLE core_audit__audit_digest (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  record_count bigint NOT NULL,
  first_record_hash text NOT NULL,
  last_record_hash text NOT NULL,
  merkle_root text NOT NULL,
  previous_digest_signature text,
  signature text NOT NULL,
  signing_key_id text NOT NULL,
  published_at timestamptz NOT NULL,
  external_anchor_ref text
);

ALTER TABLE core_audit__audit_digest ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_audit__audit_digest FORCE ROW LEVEL SECURITY;
CREATE POLICY core_audit__audit_digest_tenant_isolation ON core_audit__audit_digest
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- window_start: immutable after create; enforced by trigger, not by application code
-- window_end: immutable after create; enforced by trigger, not by application code
-- record_count: immutable after create; enforced by trigger, not by application code
-- first_record_hash: immutable after create; enforced by trigger, not by application code
-- last_record_hash: immutable after create; enforced by trigger, not by application code
-- merkle_root: immutable after create; enforced by trigger, not by application code
-- previous_digest_signature: immutable after create; enforced by trigger, not by application code
-- signature: immutable after create; enforced by trigger, not by application code
-- signing_key_id: immutable after create; enforced by trigger, not by application code
-- published_at: immutable after create; enforced by trigger, not by application code
-- external_anchor_ref: immutable after create; enforced by trigger, not by application code
