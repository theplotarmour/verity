-- Generated from _model/capabilities/work_order.yaml · entity work_type
-- Tenancy mode: tenant_scoped

CREATE TABLE work_order__work_type (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  checklist_template_id uuid,
  required_qualification_keys jsonb,
  default_duration_minutes integer,
  presence_evidence_required text NOT NULL,
  photo_evidence_min_count integer NOT NULL,
  signoff_by text NOT NULL,
  signature_required boolean NOT NULL,
  allows_parts boolean NOT NULL,
  default_billable text NOT NULL,
  reopen_window_days integer NOT NULL,
  hold_reasons jsonb NOT NULL,
  source_pack_key text
);

ALTER TABLE work_order__work_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order__work_type FORCE ROW LEVEL SECURITY;
CREATE POLICY work_order__work_type_tenant_isolation ON work_order__work_type
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
