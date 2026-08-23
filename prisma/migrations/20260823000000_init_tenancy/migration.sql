-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_tenant_id_idx" ON "organization"("tenant_id");

-- CreateIndex
CREATE INDEX "organization_tenant_id_parent_id_idx" ON "organization"("tenant_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_tenant_id_id_key" ON "organization"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_tenant_id_parent_id_fkey" FOREIGN KEY ("tenant_id", "parent_id") REFERENCES "organization"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- Tenant isolation (INV-001)
--
-- Authority: Bible V5 §1.A.2 — "Database operations must use Row-Level Security
-- (RLS) policies at the PostgreSQL engine level ... Tenant context is derived
-- strictly from the authenticated session, never from user-supplied query
-- parameters." Reinforced by Spec PLA-TEN-002 and PLA-TEN-006 [DECIDED].
--
-- The tenant context lives in the `verity.tenant_id` GUC. The server sets it
-- with `SET LOCAL` inside the same transaction as the query, from the verified
-- auth context only. It is never taken from a request payload.
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "verity";

-- Returns the tenant bound to the current transaction, or NULL when none is set.
-- NULL is the fail-closed value: every policy below compares against it, and a
-- comparison with NULL is never true, so an unscoped connection sees no rows
-- and can write none.
CREATE OR REPLACE FUNCTION verity.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('verity.tenant_id', true), '')::UUID;
$$;

-- FORCE is required, not optional: without it the table owner (the role Prisma
-- connects as) silently bypasses every policy below, and the isolation tests
-- would pass while the platform leaked.
ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization" FORCE ROW LEVEL SECURITY;

-- A Tenant row is visible only to itself. Provisioning a new Tenant means
-- setting `verity.tenant_id` to the id being created, so the INSERT satisfies
-- WITH CHECK without any role that bypasses RLS.
CREATE POLICY "tenant_isolation" ON "tenant"
  USING ("id" = verity.current_tenant_id())
  WITH CHECK ("id" = verity.current_tenant_id());

-- Every Organization read or written is confined to the current tenant.
-- WITH CHECK closes the write side: a row cannot be inserted into, or moved to,
-- another tenant (PLA-TEN-001, PLA-TEN-003).
CREATE POLICY "organization_isolation" ON "organization"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- REQUIRED DEPLOYMENT CONDITION
--
-- Row-level security is NOT enforced for a role that is SUPERUSER or has
-- BYPASSRLS. Connecting the application as such a role disables every policy
-- above while leaving them present and syntactically valid — isolation fails
-- silently and the test suite still passes.
--
-- The role in DATABASE_URL must therefore be created NOSUPERUSER NOBYPASSRLS
-- and granted only what it needs, e.g.:
--
--   CREATE ROLE verity_app LOGIN NOSUPERUSER NOBYPASSRLS;
--   GRANT USAGE ON SCHEMA public, verity TO verity_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO verity_app;
--   GRANT EXECUTE ON FUNCTION verity.current_tenant_id() TO verity_app;
--
-- Note for Supabase: the default `postgres` role is a superuser and must not be
-- used for application traffic.
--
-- `assertRlsEnforceable()` in src/server/platform/tenancy.ts enforces this at
-- startup and in src/test/tenant-isolation.test.ts.
-- ---------------------------------------------------------------------------
