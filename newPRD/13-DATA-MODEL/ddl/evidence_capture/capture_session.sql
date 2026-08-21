-- Generated from _model/capabilities/evidence_capture.yaml · entity capture_session
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE evidence_capture__capture_session (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  subject_capability_key text NOT NULL,
  subject_ref uuid NOT NULL,
  opened_at timestamptz NOT NULL,
  closed_at timestamptz,
  item_ids jsonb NOT NULL,
  required_keys jsonb NOT NULL,
  satisfied_keys jsonb NOT NULL,
  override_reason text,
  override_by_principal_id uuid,
  device_ref uuid,
  created_offline boolean NOT NULL
);

ALTER TABLE evidence_capture__capture_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_capture__capture_session FORCE ROW LEVEL SECURITY;
CREATE POLICY evidence_capture__capture_session_tenant_isolation ON evidence_capture__capture_session
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
