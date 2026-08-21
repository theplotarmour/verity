-- Generated from _model/capabilities/helpdesk.yaml · entity ticket_category
-- Tenancy mode: tenant_scoped

CREATE TABLE helpdesk__ticket_category (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  parent_category_id uuid,
  default_queue_id uuid,
  default_priority text NOT NULL,
  first_response_target_minutes integer,
  resolution_target_minutes integer,
  converts_to_work_type_ref uuid,
  requires_subject boolean NOT NULL,
  owner_principal_id uuid,
  reporter_selectable boolean NOT NULL
);

ALTER TABLE helpdesk__ticket_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk__ticket_category FORCE ROW LEVEL SECURITY;
CREATE POLICY helpdesk__ticket_category_tenant_isolation ON helpdesk__ticket_category
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
