-- Generated from _model/capabilities/core_audit.yaml · entity audit_record
-- Tenancy mode: tenant_scoped

CREATE TABLE core_audit__audit_record (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  audit_class text NOT NULL,
  actor_type text NOT NULL,
  actor_principal_id uuid,
  authority_kind text NOT NULL,
  authority_ref uuid,
  on_behalf_of_principal_id uuid,
  verb text NOT NULL,
  capability_key text NOT NULL,
  entity_key text NOT NULL,
  subject_id uuid,
  subject_label_at_time text,
  before jsonb,
  after jsonb,
  changed_field_keys jsonb,
  reason text,
  source text NOT NULL,
  correlation_id uuid NOT NULL,
  causation_id uuid,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL,
  ip inet,
  device_id uuid,
  geo geography(Point,4326),
  record_hash text NOT NULL,
  previous_record_hash text,
  retention_class text NOT NULL
);

ALTER TABLE core_audit__audit_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_audit__audit_record FORCE ROW LEVEL SECURITY;
CREATE POLICY core_audit__audit_record_tenant_isolation ON core_audit__audit_record
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- audit_class: immutable after create; enforced by trigger, not by application code
-- actor_type: immutable after create; enforced by trigger, not by application code
-- actor_principal_id: immutable after create; enforced by trigger, not by application code
-- authority_kind: immutable after create; enforced by trigger, not by application code
-- authority_ref: immutable after create; enforced by trigger, not by application code
-- on_behalf_of_principal_id: immutable after create; enforced by trigger, not by application code
-- verb: immutable after create; enforced by trigger, not by application code
-- capability_key: immutable after create; enforced by trigger, not by application code
-- entity_key: immutable after create; enforced by trigger, not by application code
-- subject_id: immutable after create; enforced by trigger, not by application code
-- subject_label_at_time: immutable after create; enforced by trigger, not by application code
-- before: immutable after create; enforced by trigger, not by application code
-- after: immutable after create; enforced by trigger, not by application code
-- changed_field_keys: immutable after create; enforced by trigger, not by application code
-- reason: immutable after create; enforced by trigger, not by application code
-- source: immutable after create; enforced by trigger, not by application code
-- correlation_id: immutable after create; enforced by trigger, not by application code
-- causation_id: immutable after create; enforced by trigger, not by application code
-- occurred_at: immutable after create; enforced by trigger, not by application code
-- recorded_at: immutable after create; enforced by trigger, not by application code
-- ip: immutable after create; enforced by trigger, not by application code
-- device_id: immutable after create; enforced by trigger, not by application code
-- geo: immutable after create; enforced by trigger, not by application code
-- record_hash: immutable after create; enforced by trigger, not by application code
-- previous_record_hash: immutable after create; enforced by trigger, not by application code
