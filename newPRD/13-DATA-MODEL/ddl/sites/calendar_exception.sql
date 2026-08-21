-- Generated from _model/capabilities/sites.yaml · entity calendar_exception
-- Tenancy mode: tenant_scoped

CREATE TABLE sites__calendar_exception (
  id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  calendar_id uuid NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  kind text NOT NULL,
  open_time time,
  close_time time,
  label text NOT NULL,
  source text NOT NULL
);

ALTER TABLE sites__calendar_exception ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites__calendar_exception FORCE ROW LEVEL SECURITY;
CREATE POLICY sites__calendar_exception_tenant_isolation ON sites__calendar_exception
  USING (tenant_id = current_setting('verity.tenant_id')::uuid);

-- Immutability triggers
-- id: immutable after create; enforced by trigger, not by application code
-- tenant_id: immutable after create; enforced by trigger, not by application code
