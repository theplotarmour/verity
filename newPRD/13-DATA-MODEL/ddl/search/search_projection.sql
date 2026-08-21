-- Generated from _model/capabilities/search.yaml · entity search_projection
-- Tenancy mode: tenant_scoped

CREATE TABLE search__search_projection (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  capability_key text NOT NULL,
  entity_key text NOT NULL,
  field_projections jsonb NOT NULL,
  display_fields jsonb NOT NULL,
  scope_fields jsonb NOT NULL,
  freshness_target_seconds integer NOT NULL,
  reindex_priority text NOT NULL,
  include_archived boolean NOT NULL,
  version_number integer NOT NULL
);

ALTER TABLE search__search_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE search__search_projection FORCE ROW LEVEL SECURITY;
CREATE POLICY search__search_projection_tenant_isolation ON search__search_projection
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
