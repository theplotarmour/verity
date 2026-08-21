-- Generated from _model/capabilities/hq_console.yaml · entity tenant
-- Tenancy mode: platform_scoped

CREATE TABLE hq_console__tenant (
  id uuid NOT NULL,
  key text NOT NULL,
  display_name text NOT NULL,
  legal_party_ref text,
  created_at timestamptz NOT NULL,
  plan_key text NOT NULL,
  seat_entitlement integer,
  data_residency_region text NOT NULL,
  primary_locale text NOT NULL,
  primary_timezone text NOT NULL,
  support_access_consent_until timestamptz,
  support_access_contract_clause boolean NOT NULL,
  current_manifest_id uuid,
  suspension_reason text,
  suspended_at timestamptz,
  closure_requested_at timestamptz,
  data_erasure_due_at timestamptz,
  export_delivered_at timestamptz
);

ALTER TABLE hq_console__tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_console__tenant FORCE ROW LEVEL SECURITY;

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- key: immutable after create; enforced by trigger, not by application code
-- created_at: immutable after create; enforced by trigger, not by application code
-- data_residency_region: immutable after create; enforced by trigger, not by application code
