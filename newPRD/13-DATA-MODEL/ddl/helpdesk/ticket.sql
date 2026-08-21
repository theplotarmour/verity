-- Generated from _model/capabilities/helpdesk.yaml · entity ticket
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE helpdesk__ticket (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  subject text NOT NULL,
  body text,
  reporter_party_ref uuid,
  reporter_contact_raw text,
  channel text NOT NULL,
  location_ref uuid,
  subject_ref uuid,
  category_id uuid,
  priority text NOT NULL,
  priority_source text NOT NULL,
  queue_id uuid,
  assignee_principal_id uuid,
  routing_explanation text,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution_kind text,
  resolution_note text,
  converted_work_refs jsonb,
  merged_into_ticket_id uuid,
  reopen_of_ticket_id uuid,
  reopen_count integer NOT NULL,
  satisfaction_score integer,
  last_reporter_contact_at timestamptz
);

ALTER TABLE helpdesk__ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk__ticket FORCE ROW LEVEL SECURITY;
CREATE POLICY helpdesk__ticket_tenant_isolation ON helpdesk__ticket
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
