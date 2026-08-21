-- Generated from _model/capabilities/search.yaml · entity saved_search
-- Tenancy mode: tenant_scoped

CREATE TABLE search__saved_search (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  owner_principal_id uuid NOT NULL,
  label text NOT NULL,
  term text,
  filters jsonb,
  entity_keys jsonb NOT NULL,
  shared_with_role_keys jsonb,
  is_pinned boolean NOT NULL,
  last_run_at timestamptz,
  run_count integer NOT NULL,
  result_count_at_last_run integer,
  notify_on_new_results boolean NOT NULL
);

ALTER TABLE search__saved_search ENABLE ROW LEVEL SECURITY;
ALTER TABLE search__saved_search FORCE ROW LEVEL SECURITY;
CREATE POLICY search__saved_search_tenant_isolation ON search__saved_search
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
