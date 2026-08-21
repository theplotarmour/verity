-- Generated from _model/capabilities/evidence_capture.yaml · entity evidence_item
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE evidence_capture__evidence_item (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  kind text NOT NULL,
  subject_capability_key text NOT NULL,
  subject_ref uuid NOT NULL,
  requirement_key text,
  captured_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  captured_by_principal_id uuid NOT NULL,
  device_ref uuid,
  position geography(Point,4326),
  position_accuracy_m integer,
  position_verdict text NOT NULL,
  content_hash text NOT NULL,
  content_size_bytes bigint NOT NULL,
  content_type text NOT NULL,
  storage_ref text,
  capture_metadata jsonb,
  from_live_capture boolean,
  clock_skew_seconds integer,
  redacted_at timestamptz,
  redaction_reason text,
  retention_class text NOT NULL,
  expires_at timestamptz
);

ALTER TABLE evidence_capture__evidence_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_capture__evidence_item FORCE ROW LEVEL SECURITY;
CREATE POLICY evidence_capture__evidence_item_tenant_isolation ON evidence_capture__evidence_item
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- kind: immutable after create; enforced by trigger, not by application code
-- subject_capability_key: immutable after create; enforced by trigger, not by application code
-- subject_ref: immutable after create; enforced by trigger, not by application code
-- requirement_key: immutable after create; enforced by trigger, not by application code
-- captured_at: immutable after create; enforced by trigger, not by application code
-- received_at: immutable after create; enforced by trigger, not by application code
-- captured_by_principal_id: immutable after create; enforced by trigger, not by application code
-- device_ref: immutable after create; enforced by trigger, not by application code
-- position: immutable after create; enforced by trigger, not by application code
-- position_accuracy_m: immutable after create; enforced by trigger, not by application code
-- position_verdict: immutable after create; enforced by trigger, not by application code
-- content_hash: immutable after create; enforced by trigger, not by application code
-- content_size_bytes: immutable after create; enforced by trigger, not by application code
-- content_type: immutable after create; enforced by trigger, not by application code
-- capture_metadata: immutable after create; enforced by trigger, not by application code
-- from_live_capture: immutable after create; enforced by trigger, not by application code
-- clock_skew_seconds: immutable after create; enforced by trigger, not by application code
