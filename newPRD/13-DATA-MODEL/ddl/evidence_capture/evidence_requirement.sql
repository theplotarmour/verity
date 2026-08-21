-- Generated from _model/capabilities/evidence_capture.yaml · entity evidence_requirement
-- Tenancy mode: tenant_scoped

CREATE TABLE evidence_capture__evidence_requirement (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  requirement_key text NOT NULL,
  declaring_capability_key text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL,
  min_count integer NOT NULL,
  max_count integer,
  requires_live_capture boolean NOT NULL,
  requires_position boolean NOT NULL,
  min_position_accuracy_m integer,
  prompt_text text NOT NULL,
  retention_class text NOT NULL,
  retention_months integer,
  subject_visible boolean NOT NULL,
  sensitive boolean NOT NULL,
  source_pack_key text
);

ALTER TABLE evidence_capture__evidence_requirement ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_capture__evidence_requirement FORCE ROW LEVEL SECURITY;
CREATE POLICY evidence_capture__evidence_requirement_tenant_isolation ON evidence_capture__evidence_requirement
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- requirement_key: immutable after create; enforced by trigger, not by application code
