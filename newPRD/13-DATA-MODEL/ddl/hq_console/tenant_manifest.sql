-- Generated from _model/capabilities/hq_console.yaml · entity tenant_manifest
-- Tenancy mode: platform_scoped

CREATE TABLE hq_console__tenant_manifest (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  manifest_version integer NOT NULL,
  generated_at timestamptz NOT NULL,
  generated_by_principal_id uuid NOT NULL,
  capability_versions jsonb NOT NULL,
  pack_versions jsonb NOT NULL,
  port_bindings jsonb NOT NULL,
  configuration_deltas jsonb NOT NULL,
  rule_overrides jsonb NOT NULL,
  role_expansions jsonb NOT NULL,
  navigation_tree jsonb NOT NULL,
  workflow_versions jsonb NOT NULL,
  integration_bindings jsonb NOT NULL,
  schema_fingerprint text NOT NULL,
  deployed_at timestamptz,
  superseded_at timestamptz,
  last_reconciled_at timestamptz,
  drift_findings jsonb
);

ALTER TABLE hq_console__tenant_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_console__tenant_manifest FORCE ROW LEVEL SECURITY;

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- manifest_version: immutable after create; enforced by trigger, not by application code
-- generated_at: immutable after create; enforced by trigger, not by application code
-- generated_by_principal_id: immutable after create; enforced by trigger, not by application code
-- capability_versions: immutable after create; enforced by trigger, not by application code
-- pack_versions: immutable after create; enforced by trigger, not by application code
-- port_bindings: immutable after create; enforced by trigger, not by application code
-- configuration_deltas: immutable after create; enforced by trigger, not by application code
-- rule_overrides: immutable after create; enforced by trigger, not by application code
-- role_expansions: immutable after create; enforced by trigger, not by application code
-- navigation_tree: immutable after create; enforced by trigger, not by application code
-- workflow_versions: immutable after create; enforced by trigger, not by application code
-- integration_bindings: immutable after create; enforced by trigger, not by application code
-- schema_fingerprint: immutable after create; enforced by trigger, not by application code
