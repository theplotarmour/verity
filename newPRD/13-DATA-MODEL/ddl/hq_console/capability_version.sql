-- Generated from _model/capabilities/hq_console.yaml · entity capability_version
-- Tenancy mode: platform_scoped

CREATE TABLE hq_console__capability_version (
  id uuid NOT NULL,
  capability_key text NOT NULL,
  semver text NOT NULL,
  is_breaking boolean NOT NULL,
  breaking_reasons jsonb,
  released_at timestamptz,
  deprecates_version text,
  migration_required boolean NOT NULL,
  migration_is_reversible boolean,
  override_impact_summary jsonb,
  tenant_count_on_version integer NOT NULL,
  known_issues text
);

ALTER TABLE hq_console__capability_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE hq_console__capability_version FORCE ROW LEVEL SECURITY;

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- capability_key: immutable after create; enforced by trigger, not by application code
-- semver: immutable after create; enforced by trigger, not by application code
