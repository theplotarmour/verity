-- Generated from _model/capabilities/procurement.yaml · entity purchase_request
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE procurement__purchase_request (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  requested_by_principal_id uuid NOT NULL,
  location_ref uuid,
  needed_by date,
  justification text,
  source_capability_key text,
  source_ref uuid,
  lines jsonb NOT NULL,
  estimated_total_minor bigint,
  currency text NOT NULL,
  approval_route_ref uuid,
  approved_by_principal_id uuid,
  approved_at timestamptz,
  rejection_reason text
);

ALTER TABLE procurement__purchase_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement__purchase_request FORCE ROW LEVEL SECURITY;
CREATE POLICY procurement__purchase_request_tenant_isolation ON procurement__purchase_request
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- reference: immutable after create; enforced by trigger, not by application code
