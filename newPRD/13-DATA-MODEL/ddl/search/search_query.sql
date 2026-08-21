-- Generated from _model/capabilities/search.yaml · entity search_query
-- Tenancy mode: tenant_scoped

CREATE TABLE search__search_query (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  principal_id uuid NOT NULL,
  term text,
  filters jsonb,
  scope_fingerprint text NOT NULL,
  entity_keys_searched jsonb NOT NULL,
  result_count_returned integer NOT NULL,
  candidates_considered integer NOT NULL,
  candidates_removed_by_recheck integer NOT NULL,
  index_lag_seconds integer,
  duration_ms integer NOT NULL,
  executed_at timestamptz NOT NULL,
  surface text NOT NULL,
  selected_result_position integer
);

ALTER TABLE search__search_query ENABLE ROW LEVEL SECURITY;
ALTER TABLE search__search_query FORCE ROW LEVEL SECURITY;
CREATE POLICY search__search_query_tenant_isolation ON search__search_query
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
-- executed_at: immutable after create; enforced by trigger, not by application code
