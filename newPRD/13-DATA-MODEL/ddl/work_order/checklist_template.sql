-- Generated from _model/capabilities/work_order.yaml · entity checklist_template
-- Tenancy mode: tenant_scoped

CREATE TABLE work_order__checklist_template (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  version_number integer NOT NULL,
  items jsonb NOT NULL,
  published_at timestamptz,
  published_by_principal_id uuid
);

ALTER TABLE work_order__checklist_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order__checklist_template FORCE ROW LEVEL SECURITY;
CREATE POLICY work_order__checklist_template_tenant_isolation ON work_order__checklist_template
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
