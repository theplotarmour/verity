-- Generated from _model/capabilities/helpdesk.yaml · entity ticket_message
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE helpdesk__ticket_message (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  direction text NOT NULL,
  visibility text NOT NULL,
  channel text NOT NULL,
  body text NOT NULL,
  author_principal_id uuid,
  author_party_ref uuid,
  sent_at timestamptz NOT NULL,
  delivery_state text NOT NULL,
  attachment_refs jsonb,
  counts_as_first_response boolean NOT NULL,
  redacted_at timestamptz,
  redacted_by_principal_id uuid
);

ALTER TABLE helpdesk__ticket_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpdesk__ticket_message FORCE ROW LEVEL SECURITY;
CREATE POLICY helpdesk__ticket_message_tenant_isolation ON helpdesk__ticket_message
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
