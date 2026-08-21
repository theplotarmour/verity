-- Generated from _model/capabilities/scheduling_dispatch.yaml · entity assignment
-- Tenancy mode: tenant_scoped_with_site_partition

CREATE TABLE scheduling_dispatch__assignment (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  demand_id uuid NOT NULL,
  resource_ref uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  assigned_by text NOT NULL,
  assigned_by_principal_id uuid,
  assignment_reason text,
  acceptance_required boolean NOT NULL,
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  published_at timestamptz,
  overtime_minutes integer,
  cost_estimate_minor bigint,
  swap_of_assignment_id uuid,
  version integer NOT NULL
);

ALTER TABLE scheduling_dispatch__assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_dispatch__assignment FORCE ROW LEVEL SECURITY;
CREATE POLICY scheduling_dispatch__assignment_tenant_isolation ON scheduling_dispatch__assignment
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
