-- Generated from _model/capabilities/party.yaml · entity merge_proposal
-- Tenancy mode: tenant_scoped

CREATE TABLE party__merge_proposal (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  survivor_party_id uuid NOT NULL,
  absorbed_party_id uuid NOT NULL,
  score numeric(18,4) NOT NULL,
  matched_on jsonb NOT NULL,
  conflicts jsonb NOT NULL,
  field_resolution jsonb,
  proposed_by text NOT NULL,
  proposed_by_principal_id uuid,
  reviewed_by_principal_id uuid,
  executed_at timestamptz,
  merge_journal jsonb,
  undo_deadline_at timestamptz
);

ALTER TABLE party__merge_proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE party__merge_proposal FORCE ROW LEVEL SECURITY;
CREATE POLICY party__merge_proposal_tenant_isolation ON party__merge_proposal
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
